<?php

namespace Tests\Nident;

use App\Jobs\Nident\SendTemplateMail;
use App\Models\Nident\MailSetting;
use App\Models\Nident\MailTemplate;
use App\Models\User;
use App\Services\Nident\MailBranding;
use App\Services\Nident\MailImages;
use App\Services\Nident\MailOutbox;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Mail\Events\MessageSent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Tests\TestCase;

class MailBrandingListsTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        if (DB::connection()->getDatabaseName() !== 'nident_testing') {
            throw new \RuntimeException('Base no aislada.');
        }
    }

    private function principal(): void
    {
        $user = new User(['Activo' => 'S', 'es_administrador_principal' => true]);
        $user->id = 900001;
        $this->actingAs($user, 'api');
    }

    public function test_branding_is_versioned_scoped_and_separate_from_smtp(): void
    {
        $this->getJson('/api/v1/admin/mail/branding')->assertUnauthorized();
        $this->principal();
        $smtp = MailSetting::find(1)->only(['version', 'host', 'enabled', 'transport']);
        $row = $this->getJson('/api/v1/admin/mail/branding')->assertOk()->json('result');
        $this->assertSame('/email-assets/nident-logo.png', $row['branding']['logo']);
        $row['branding']['phone'] = '999000000';
        $row['branding']['links'] = [['label' => 'Privacidad', 'url' => 'https://example.invalid/privacidad']];
        $this->putJson('/api/v1/admin/mail/branding', $row)->assertOk()->assertJsonPath('result.version', $row['version'] + 1);
        $this->putJson('/api/v1/admin/mail/branding', $row)->assertConflict();
        $this->assertSame($smtp, MailSetting::find(1)->only(['version', 'host', 'enabled', 'transport']));
        $row['version']++;
        $row['branding']['logo'] = 'file:///private/secret.png';
        $this->putJson('/api/v1/admin/mail/branding', $row)->assertUnprocessable();
        $row['branding']['logo'] = '/media/../../secret.png';
        $this->putJson('/api/v1/admin/mail/branding', $row)->assertUnprocessable();
        $row['branding']['logo'] = MailBranding::defaults()['logo'];
        $row['branding']['links'][0]['url'] = 'javascript:alert(1)';
        $this->putJson('/api/v1/admin/mail/branding', $row)->assertUnprocessable();
        $user = new User(['Activo' => 'S', 'es_administrador_principal' => false]);
        $user->id = 900002;
        $this->actingAs($user, 'api')->putJson('/api/v1/admin/mail/branding', $row)->assertForbidden();
    }

    public function test_email_escapes_branding_and_embeds_owned_logo_and_banner_without_network(): void
    {
        $this->principal();
        $template = MailTemplate::where('key', 'contact_received')->firstOrFail();
        $branding = MailBranding::defaults();
        $branding['footer_text'] = '<script>unsafe</script>';
        $branding['links'] = [['label' => 'Sitio <b>ejemplo</b>', 'url' => 'https://example.invalid/']];
        $preview = $this->postJson('/api/v1/admin/mail/branding/preview', ['version' => 1, 'branding' => $branding, 'template_id' => $template->id])->assertOk()->json('result.html');
        $this->assertStringContainsString('&lt;script&gt;unsafe&lt;/script&gt;', $preview);
        $this->assertStringNotContainsString('<script>', $preview);
        $this->assertStringContainsString('/email-assets/nident-banner.jpg', $preview);
        $prepared = app(MailImages::class)->prepare($preview);
        $this->assertCount(2, $prepared['images']);
        $this->assertStringContainsString('src="cid:nident-', $prepared['html']);
        $this->assertNull(MailImages::path('/media/../../.env'));
        $this->assertNull(MailImages::path('https://example.invalid/logo.png'));
        $template->update(['published' => $template->draft, 'published_version' => $template->version]);
        MailSetting::find(1)->update(['enabled' => true, 'transport' => 'array', 'from_address' => 'sender@example.invalid']);
        $outbox = app(MailOutbox::class)->enqueue('contact_received', 'synthetic@example.invalid', ['nombre' => 'Prueba'], 'test:inline-logo');
        $captured = null;
        Event::listen(MessageSent::class, function ($event) use (&$captured) {
            $captured = $event->sent->getOriginalMessage();
        });
        (new SendTemplateMail($outbox->id))->handle();
        $this->assertSame('simulated', $outbox->fresh()->status);
        $this->assertNotNull($captured);
        $this->assertCount(2, $captured->getAttachments());
        $this->assertStringContainsString('cid:', $captured->getHtmlBody());
        $this->assertStringNotContainsString('src="/email-assets/', $captured->getHtmlBody());
        $mime=$captured->toString();
        $this->assertStringContainsString('multipart/related',$mime);
        $this->assertStringContainsString('Content-ID:',$mime);
    }

    public function test_message_and_reservation_search_filters_and_paging_run_on_the_backend(): void
    {
        $this->principal();
        $tag = 'paging-'.Str::uuid();
        for ($i = 0; $i < 31; $i++) {
            $id = (string) Str::uuid();
            DB::table('web_contacto_mensaje')->insert(['nombre' => 'Persona '.$tag, 'apellido' => '', 'email' => 'contact@example.invalid', 'asunto' => 'Consulta', 'producto_interes' => 'Evaluación', 'fecha_mensaje' => today(), 'telefono' => '999000000', 'mensaje' => 'Texto sintético para prueba.', 'email_enviado' => 'N', 'nident_request_id' => $id, 'nident_request_hash' => hash('sha256', $id), 'nident_reference' => 'NID-'.strtoupper(bin2hex(random_bytes(8))), 'nident_read_at' => $i < 25 ? null : now(), 'created_at' => now(), 'updated_at' => now()]);
            DB::table('nident_reservations')->insert(['name' => 'Paciente '.$i, 'email' => $tag.'@example.invalid', 'phone' => '999000001', 'treatment' => 'Evaluación', 'branch' => 'Prueba', 'preferred_date' => today()->addDay(), 'preferred_time' => '10:00', 'code' => 'NID-'.strtoupper(bin2hex(random_bytes(6))), 'request_id' => $id, 'request_hash' => hash('sha256', $id), 'created_at' => now(), 'updated_at' => now()]);
        }
        $params = http_build_query(['search' => $tag, 'status' => 'unread', 'per_page' => 20, 'page' => 2, 'date_from' => today()->toDateString(), 'date_to' => today()->toDateString()]);
        $r = $this->getJson('/api/v1/admin/messages?'.$params)->assertOk()->assertJsonPath('result.total', 25)->assertJsonPath('result.current_page', 2);
        $this->assertCount(5, $r->json('result.data'));
        $this->getJson('/api/v1/admin/messages?search='.urlencode($tag).'&status=read')->assertOk()->assertJsonPath('result.total', 6);
        $this->getJson('/api/v1/admin/messages?per_page=10000')->assertUnprocessable();
        $this->getJson('/api/v1/admin/messages?date_from=2026-10-24&date_to=2026-10-20')->assertUnprocessable();
        $r = $this->getJson('/api/v1/admin/reservations?'.http_build_query(['search' => $tag, 'per_page' => 20, 'page' => 2]))->assertOk()->assertJsonPath('result.total', 31);
        $this->assertCount(11,$r->json('result.data'));
        $this->getJson('/api/v1/admin/reservations?per_page=5000')->assertUnprocessable();
    }
}
