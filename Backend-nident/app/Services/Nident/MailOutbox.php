<?php

namespace App\Services\Nident;

use App\Jobs\Nident\SendTemplateMail;
use App\Models\Nident\MailDelivery;
use App\Models\Nident\MailSetting;
use App\Models\Nident\MailTemplate;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MailOutbox
{
    public function enqueue(string $key, string $recipient, array $variables, string $deduplicationKey, ?int $actor = null): MailDelivery
    {
        abort_unless(MailSetting::findOrFail(1)->enabled, 422, 'Los correos están desactivados. Configura el remitente y activa el servicio.');
        $template = MailTemplate::where('key', $key)->firstOrFail();
        abort_unless($template->published, 422, 'La plantilla todavía no está publicada.');
        $rendered = app(TemplateRenderer::class)->render($template->published, $variables);
        // A unique key handles concurrent requests; firstOrCreate retries a unique violation.
        $delivery = MailDelivery::firstOrCreate(['deduplication_key' => $deduplicationKey], [
            'id' => (string) Str::uuid(), 'template_id' => $template->id,
            'template_version' => $template->published_version, 'recipient' => $recipient,
            'subject' => $rendered['subject'], 'html' => $rendered['html'], 'requested_by' => $actor,
        ]);

        return $delivery;
    }

    public function dispatchPending(): int
    {
        $count = 0;
        foreach (MailDelivery::where('status', 'pending')->orderBy('created_at')->limit(100)->get() as $delivery) {
            DB::transaction(function () use ($delivery, &$count) {
                $changed = MailDelivery::where('id', $delivery->id)->where('status', 'pending')->update(['status' => 'queued']);
                if ($changed) {
                    // jobs and outbox share this DB transaction: no commit/enqueue gap.
                    SendTemplateMail::dispatch($delivery->id)->onConnection('database')->beforeCommit();
                    $count++;
                }
            });
        }

        return $count;
    }
}
