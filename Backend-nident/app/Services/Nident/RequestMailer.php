<?php

namespace App\Services\Nident;

use App\Models\Nident\MailDelivery;
use App\Models\Nident\MailSetting;
use App\Models\Nident\MailTemplate;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RequestMailer
{
    public function notify(string $key, string $email, array $variables, string $event, string $reference): array
    {
        $settings = MailSetting::find(1);
        $status = 'disabled';
        $delivery = null;
        if ($settings?->enabled) {
            $template = MailTemplate::where('key', $key)->first();
            $status = $template?->published ? 'pending' : 'unpublished';
            if ($template?->published) {
                try {
                    $delivery = app(MailOutbox::class)->enqueue($key, $email, $variables, $event);
                    $status = $delivery->refresh()->status;
                } catch (\Throwable $e) {
                    $status = 'failed';
                    Log::warning('Nident notification pending', ['template' => $key, 'error_code' => class_basename($e)]);
                }
            }
        }
        DB::table('nident_mail_events')->updateOrInsert(['event_key' => $event], ['reference' => $reference, 'template_key' => $key, 'delivery_id' => $delivery?->id, 'status' => $status, 'updated_at' => now(), 'created_at' => now()]);

        return ['status' => $status, 'sandbox' => $settings?->host === 'sandbox.smtp.mailtrap.io'];
    }

    public function status(string $reference): array
    {
        $event = DB::table('nident_mail_events')->where('reference', $reference)->where('template_key', '!=', 'contact_notification')->orderByDesc('id')->first();
        $delivery = $event?->delivery_id ? MailDelivery::find($event->delivery_id) : null;

        return ['status' => $delivery?->status ?? $event?->status ?? 'not_requested', 'sandbox' => $delivery ? (bool) $delivery->is_sandbox : MailSetting::find(1)?->host === 'sandbox.smtp.mailtrap.io'];
    }
}
