<?php

namespace App\Jobs\Nident;

use App\Models\Nident\MailDelivery;
use App\Models\Nident\MailSetting;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SendTemplateMail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 45;

    public function backoff(): array
    {
        return [30, 120, 300];
    }

    public function __construct(public string $deliveryId) {}

    public function handle(): void
    {
        $claimed = DB::transaction(function () {
            $delivery = MailDelivery::lockForUpdate()->findOrFail($this->deliveryId);
            if (in_array($delivery->status, ['sent', 'failed', 'simulated'], true)) {
                return false;
            }
            if ($delivery->status === 'sending' && $delivery->claimed_at?->greaterThan(now()->subMinutes(2))) {
                return 'busy';
            }
            $delivery->update(['status' => 'sending', 'claimed_at' => now(), 'attempts' => $delivery->attempts + 1]);

            return true;
        });
        if ($claimed === 'busy') {
            $this->release(30);

            return;
        }
        if (! $claimed) {
            return;
        }
        $delivery = MailDelivery::findOrFail($this->deliveryId);
        $settings = MailSetting::findOrFail(1);
        $delivery->update(['is_sandbox' => $settings->host === 'sandbox.smtp.mailtrap.io', 'transport' => $settings->transport]);
        try {
            if (! $settings->enabled || ! $settings->from_address) {
                throw new \RuntimeException('MAIL_DISABLED');
            }
            $config = $settings->transport === 'array' ? ['transport' => 'array'] : [
                'transport' => 'smtp', 'host' => $settings->host, 'port' => $settings->port,
                'encryption' => $settings->encryption, 'username' => $settings->username,
                'password' => $settings->password, 'timeout' => 15,
            ];
            config(['mail.mailers.nident' => $config]);
            Mail::purge('nident');
            Mail::mailer('nident')->html($delivery->html, function ($message) use ($settings, $delivery) {
                $message->from($settings->from_address, $settings->from_name)->to($delivery->recipient)->subject($delivery->subject);
                if ($settings->reply_to) {
                    $message->replyTo($settings->reply_to);
                }
            });
            $delivery->update(['status' => $settings->transport === 'array' ? 'simulated' : 'sent', 'sent_at' => now(), 'error_code' => null]);
        } catch (Throwable $exception) {
            $message = strtolower($exception->getMessage());
            $code = str_contains($message, 'limit') || str_contains($message, 'too many') ? 'SMTP_RATE_LIMITED' : (str_contains($message, '535') || str_contains($message, 'authenticate') ? 'SMTP_AUTH_FAILED' : (str_contains($message, 'timed out') ? 'SMTP_TIMEOUT' : (str_contains($message, 'connect') ? 'SMTP_CONNECT_FAILED' : 'MAIL_DELIVERY_FAILED')));
            $delivery->update(['status' => 'queued', 'error_code' => $code]);
            // Never let queue logs serialize SMTP credentials or message bodies.
            throw new \RuntimeException('MAIL_DELIVERY_FAILED:'.$delivery->id);
        } finally {
            Mail::purge('nident');
            config(['mail.mailers.nident' => null]);
        }
    }

    public function failed(?Throwable $exception): void
    {
        MailDelivery::where('id', $this->deliveryId)->whereNotIn('status', ['sent', 'simulated'])->update(['status' => 'failed']);
    }
}
