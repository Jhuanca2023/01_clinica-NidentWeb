<?php

namespace Tests\Nident;

use App\Jobs\Nident\SendTemplateMail;
use App\Models\Nident\MailDelivery;
use App\Models\Nident\MailSetting;
use App\Models\Nident\MailTemplate;
use App\Models\User;
use App\Services\Nident\MailOutbox;
use App\Services\Nident\TemplateRenderer;
use Database\Seeders\NidentSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class MailWorkflowTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        if (DB::connection()->getDatabaseName() !== 'nident_testing') {
            throw new \RuntimeException('Pruebas detenidas: base no aislada.');
        }
    }

    private function principal(): void
    {
        $user = new User(['name' => 'Administrador de prueba', 'email' => 'admin@example.invalid', 'Activo' => 'S', 'es_administrador_principal' => true]);
        $user->id = 900001;
        $this->actingAs($user, 'api');
    }

    public function test_anonymous_and_unprivileged_users_cannot_manage_mail(): void
    {
        $this->getJson('/api/v1/admin/mail/templates')->assertUnauthorized();
        $this->get('/api/v1/admin/mail/templates')->assertUnauthorized();
        $user = new User(['name' => 'Sin acceso', 'Activo' => 'S', 'es_administrador_principal' => false]);
        $user->id = 900002;
        $this->actingAs($user, 'api');
        $this->getJson('/api/v1/admin/mail/templates')->assertForbidden();
        $this->putJson('/api/v1/admin/mail/settings', [])->assertForbidden();
    }

    public function test_inactive_principal_is_denied(): void
    {
        $user = new User(['Activo' => 'N', 'es_administrador_principal' => true]);
        $user->id = 900003;
        $this->actingAs($user, 'api')->getJson('/api/v1/admin/mail/settings')->assertForbidden();
    }

    public function test_delegated_mail_permission_does_not_grant_site_access(): void
    {
        $profile = DB::table('seguridad_perfil')->insertGetId(['nombre' => 'Perfil sintético', 'Activo' => 'S']);
        $role = DB::table('seguridad_roles')->insertGetId(['nombre' => 'Rol sintético', 'Activo' => 'S']);
        DB::table('seguridad_perfil_users')->insert(['id_usuario' => 900002, 'id_perfil' => $profile]);
        DB::table('seguridad_roles_perfil')->insert(['id_perfil' => $profile, 'id_roles' => $role]);
        $menu = DB::table('sistema_menu')->where('url', '/admin/correos')->value('id_menu');
        DB::table('seguridad_roles_menu')->insert(['id_roles' => $role, 'id_menu' => $menu]);
        $user = new User(['Activo' => 'S', 'es_administrador_principal' => false]);
        $user->id = 900002;
        $this->actingAs($user, 'api')->getJson('/api/v1/admin/mail/templates')->assertOk();
        $this->getJson('/api/v1/admin/site/settings')->assertForbidden();
        DB::table('seguridad_roles')->where('id_roles', $role)->update(['Activo' => 'N']);
        $this->getJson('/api/v1/admin/mail/templates')->assertForbidden();
    }

    public function test_draft_publish_and_stale_updates_preserve_published_version(): void
    {
        $this->principal();
        $template = MailTemplate::first();
        $document = $template->draft;
        $document['subject'] = 'Un asunto revisado';
        $url = '/api/v1/admin/mail/templates/'.$template->id;
        $this->putJson($url, ['version' => $template->version, 'document' => $document])->assertOk()->assertJsonPath('result.version', $template->version + 1);
        $this->assertNull($template->fresh()->published);
        $this->putJson($url, ['version' => $template->version, 'document' => $document])->assertConflict();
        $version = $template->fresh()->version;
        $this->postJson($url.'/publish', ['version' => $version])->assertOk();
        $document['subject'] = 'Borrador posterior';
        $this->putJson($url, ['version' => $version, 'document' => $document])->assertOk();
        $this->assertSame('Un asunto revisado', $template->fresh()->published['subject']);
        $this->assertSame(3, DB::table('mail_template_revisions')->where('template_id', $template->id)->count());
    }

    public function test_document_rejects_unsafe_urls_unknown_variables_and_header_injection(): void
    {
        $this->principal();
        $template = MailTemplate::first();
        $url = '/api/v1/admin/mail/templates/'.$template->id.'/preview';
        $document = $template->draft;
        $document['blocks'][] = ['type' => 'button', 'text' => 'Abrir', 'url' => 'javascript:alert(1)', 'alt' => ''];
        $this->postJson($url, ['version' => 1, 'document' => $document])->assertUnprocessable();
        $document = $template->draft;
        $document['subject'] = '{{credencial_secreta}}';
        $this->postJson($url, ['version' => 1, 'document' => $document])->assertUnprocessable();
        $document['subject'] = "Asunto\r\nBcc: other@example.invalid";
        $this->postJson($url, ['version' => 1, 'document' => $document])->assertUnprocessable();
    }

    public function test_preview_accepts_empty_block_fields_and_escapes_content(): void
    {
        $this->principal();
        $template = MailTemplate::where('key', 'contact_received')->first();
        $this->postJson('/api/v1/admin/mail/templates/'.$template->id.'/preview', ['version' => 1, 'document' => $template->draft])->assertOk()->assertJsonPath('success', true);
        $rendered = app(TemplateRenderer::class)->render($template->draft, ['nombre' => '<script>alert(1)</script>']);
        $this->assertStringNotContainsString('<script>', $rendered['html']);
        $this->assertStringContainsString('&lt;script&gt;', $rendered['html']);
    }

    public function test_smtp_password_is_encrypted_and_never_returned(): void
    {
        $this->principal();
        $setting = MailSetting::find(1);
        $body = ['version' => $setting->version, 'enabled' => false, 'transport' => 'smtp', 'from_name' => 'Nident', 'from_address' => 'nident@example.invalid', 'reply_to' => '', 'contact_to' => '', 'host' => 'smtp.example.invalid', 'port' => 587, 'encryption' => 'tls', 'username' => 'example', 'password' => 'fixture-password-not-real'];
        $response = $this->putJson('/api/v1/admin/mail/settings', $body)->assertOk()->assertJsonPath('result.has_password', true);
        $this->assertArrayNotHasKey('password', $response->json('result'));
        $this->assertNotSame('fixture-password-not-real', DB::table('mail_settings')->value('password'));
        $body['version']++;
        $body['password'] = '';
        $this->putJson('/api/v1/admin/mail/settings', $body)->assertOk();
        $this->assertSame('fixture-password-not-real', MailSetting::find(1)->password);
    }

    public function test_outbox_deduplicates_snapshots_and_simulates_without_network(): void
    {
        $template = MailTemplate::where('key', 'contact_received')->first();
        $template->update(['published' => $template->draft, 'published_version' => 1]);
        MailSetting::find(1)->update(['enabled' => true, 'transport' => 'array', 'from_address' => 'nident@example.invalid']);
        $outbox = app(MailOutbox::class);
        $one = $outbox->enqueue('contact_received', 'patient@example.invalid', ['nombre' => 'Paciente de prueba'], 'test:once');
        $two = $outbox->enqueue('contact_received', 'patient@example.invalid', ['nombre' => 'Paciente de prueba'], 'test:once');
        $this->assertSame($one->id, $two->id);
        $this->assertSame(1, MailDelivery::count());
        $this->assertStringNotContainsString('Paciente de prueba', DB::table('mail_deliveries')->value('html'));
        $this->assertSame(1, $outbox->dispatchPending());
        $this->assertSame(0, $outbox->dispatchPending());
        $this->assertSame(1, DB::table('jobs')->count());
        (new SendTemplateMail($one->id))->handle();
        $this->assertSame('simulated', $one->fresh()->status);
        (new SendTemplateMail($one->id))->handle();
        $this->assertSame(1, $one->fresh()->attempts);
    }

    public function test_seeder_is_idempotent_and_preserves_edited_content(): void
    {
        $template = MailTemplate::first();
        $draft = $template->draft;
        $draft['subject'] = 'Configuración que debe conservarse';
        $template->update(['draft' => $draft]);
        $this->seed(NidentSeeder::class);
        $this->seed(NidentSeeder::class);
        $this->assertSame(6, MailTemplate::count());
        $this->assertSame('Configuración que debe conservarse', $template->fresh()->draft['subject']);
        $this->assertSame(28, DB::table('cms_pages')->count());
    }

    public function test_public_site_reads_only_published_pages_without_mutating_settings(): void
    {
        $version = DB::table('cms_site_settings')->value('version');
        DB::table('cms_pages')->where('path', '/tienda')->update(['published' => false]);
        $response = $this->getJson('/api/v1/public/site')->assertOk();
        $this->assertCount(27, $response->json('result.pages'));
        $this->assertSame($version, DB::table('cms_site_settings')->value('version'));
    }

    public function test_contact_is_persisted_once_and_rejects_reused_key_with_different_content(): void
    {
        $data = ['request_id' => (string) Str::uuid(), 'nombre' => 'Paciente sintético', 'correo' => 'patient@example.invalid', 'asunto' => 'Mi primera visita', 'mensaje' => 'Mensaje sintético para comprobar el registro.', 'acepto_privacidad' => true];
        $this->postJson('/api/v1/public/contact', array_diff_key($data, ['acepto_privacidad' => true]))->assertUnprocessable();
        $one = $this->postJson('/api/v1/public/contact', $data)->assertCreated();
        $two = $this->postJson('/api/v1/public/contact', $data)->assertCreated();
        $this->assertSame($one->json('result.reference'), $two->json('result.reference'));
        $this->assertSame(1, DB::table('web_contacto_mensaje')->where('nident_request_id', $data['request_id'])->count());
        $data['mensaje'] = 'Un contenido diferente para la misma clave.';
        $this->postJson('/api/v1/public/contact', $data)->assertConflict();
    }

    public function test_contact_queues_only_published_configured_notifications(): void
    {
        foreach (MailTemplate::whereIn('key', ['contact_received', 'contact_notification'])->get() as $template) {
            $template->update(['published' => $template->draft, 'published_version' => $template->version]);
        }
        MailSetting::find(1)->update(['enabled' => true, 'transport' => 'array', 'from_address' => 'nident@example.invalid', 'contact_to' => 'staff@example.invalid']);
        $data = ['request_id' => (string) Str::uuid(), 'nombre' => 'Paciente sintético', 'correo' => 'patient@example.invalid', 'asunto' => 'Consulta', 'mensaje' => 'Consulta ficticia sin información clínica.', 'acepto_privacidad' => true];
        $this->postJson('/api/v1/public/contact', $data)->assertCreated();
        $this->postJson('/api/v1/public/contact', $data)->assertCreated();
        $this->assertSame(2, MailDelivery::count());
        $this->assertSame(2, MailDelivery::where('status', 'pending')->count());
        $this->getJson('/api/v1/admin/messages')->assertUnauthorized();
        $this->principal();
        $this->getJson('/api/v1/admin/messages')->assertOk()->assertJsonPath('result.total', 1);
    }
}
