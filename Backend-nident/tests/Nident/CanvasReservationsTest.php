<?php

namespace Tests\Nident;

use App\Models\Nident\MailSetting;
use App\Models\Nident\MailTemplate;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class CanvasReservationsTest extends TestCase
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
        $user = new User(['Activo' => 'S', 'es_administrador_principal' => true]);
        $user->id = 900001;
        $this->actingAs($user, 'api');
    }

    public function test_modules_require_permission_and_drafts_remain_private(): void
    {
        $this->getJson('/api/v1/admin/site/modules')->assertUnauthorized();
        $this->getJson('/api/v1/admin/reservations')->assertUnauthorized();
        $user = new User(['Activo' => 'S', 'es_administrador_principal' => false]);
        $user->id = 900002;
        $this->actingAs($user, 'api')->getJson('/api/v1/admin/site/modules')->assertForbidden();
        $this->getJson('/api/v1/admin/reservations')->assertForbidden();
        $this->principal();
        $schema = json_decode(file_get_contents(database_path('seeders/data/nident-canvas.json')), true);
        $field = collect($schema['nosotros']['fields'])->firstWhere('type', 'text')['id'];
        $row = DB::table('cms_modules')->where('key', 'nosotros')->first();
        $draft = [$field => '<script>Contenido tratado como texto</script>'];
        $this->putJson('/api/v1/admin/site/modules/nosotros', ['version' => $row->version, 'content' => $draft])->assertOk();
        $public = $this->getJson('/api/v1/public/site')->assertOk()->json('result.modules.nosotros');
        $this->assertArrayNotHasKey($field, $public);
        $this->putJson('/api/v1/admin/site/modules/nosotros', ['version' => $row->version, 'content' => $draft])->assertConflict();
        $this->postJson('/api/v1/admin/site/modules/nosotros/publish', ['version' => $row->version + 1])->assertOk();
        $this->getJson('/api/v1/public/site')->assertJsonPath('result.modules.nosotros.'.$field, $draft[$field]);
        $this->postJson('/api/v1/admin/site/modules/nosotros/publish', ['version' => $row->version + 1])->assertConflict();
    }

    public function test_canvas_rejects_unknown_fields_and_unsafe_images_or_links(): void
    {
        $this->principal();
        $schema = json_decode(file_get_contents(database_path('seeders/data/nident-canvas.json')), true);
        $row = DB::table('cms_modules')->where('key', 'encabezado')->first();
        foreach (['image' => '/media/bad.svg', 'link' => 'javascript:alert(1)'] as $type => $value) {
            $id = collect($schema['encabezado']['fields'])->firstWhere('type', $type)['id'];
            $this->putJson('/api/v1/admin/site/modules/encabezado', ['version' => $row->version, 'content' => [$id => $value]])->assertUnprocessable();
        }
        $this->putJson('/api/v1/admin/site/modules/encabezado', ['version' => $row->version, 'content' => ['inventado' => 'valor']])->assertUnprocessable();
        $this->postJson('/api/v1/admin/site/media', [])->assertUnprocessable();
        $this->get('/api/v1/public/media/evil.svg')->assertNotFound();
    }

    private function requestData(): array
    {
        return ['request_id' => (string) Str::uuid(), 'name' => 'Paciente sintético', 'email' => 'test@example.invalid', 'phone' => '999123456', 'treatment' => 'Evaluación general', 'branch' => 'Por coordinar', 'preferred_date' => now()->addDays(3)->toDateString(), 'preferred_time' => '10:30', 'privacy' => true, 'website' => ''];
    }

    public function test_uploaded_images_are_stored_and_served_without_exposing_paths(): void
    {
        Storage::fake('local');
        $this->principal();
        $response = $this->post('/api/v1/admin/site/media', ['image' => UploadedFile::fake()->image('imagen.png', 200, 100)], ['Accept' => 'application/json'])->assertCreated();
        $url = $response->json('result.url');
        $this->assertMatchesRegularExpression('~^/media/[a-f0-9]{40}\.png$~', $url);
        Storage::disk('local')->assertExists('nident-media/'.basename($url));
        $this->get('/api/v1/public/media/'.basename($url))->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->post('/api/v1/admin/site/media', ['image' => UploadedFile::fake()->createWithContent('bad.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')], ['Accept' => 'application/json'])->assertUnprocessable();
    }

    public function test_reservations_are_idempotent_pending_and_do_not_expose_patient_data(): void
    {
        $data = $this->requestData();
        $code = $this->postJson('/api/v1/public/reservations', $data)->assertCreated()->json('result.code');
        $this->postJson('/api/v1/public/reservations', $data)->assertCreated()->assertJsonPath('result.code', $code);
        $this->assertSame(1, DB::table('nident_reservations')->where('request_id', $data['request_id'])->count());
        $this->assertSame('pending', DB::table('nident_reservations')->where('request_id', $data['request_id'])->value('status'));
        $this->postJson('/api/v1/public/reservations', [...$data, 'name' => 'Otro paciente'])->assertConflict();
        $this->postJson('/api/v1/public/reservations', [...$this->requestData(), 'privacy' => false])->assertUnprocessable();
        $this->postJson('/api/v1/public/reservations', [...$this->requestData(), 'preferred_date' => '2000-01-01'])->assertUnprocessable();
        $this->getJson('/api/v1/admin/reservations')->assertUnauthorized();
    }

    public function test_confirmation_is_versioned_and_enqueues_the_published_email(): void
    {
        $data = $this->requestData();
        $this->postJson('/api/v1/public/reservations', $data)->assertCreated();
        $this->principal();
        $row = DB::table('nident_reservations')->where('request_id', $data['request_id'])->first();
        MailSetting::find(1)->update(['enabled' => true]);
        $template = MailTemplate::where('key', 'appointment_confirmed')->first();
        $template->update(['published' => $template->draft, 'published_version' => 1]);
        $update = ['version' => 1, 'status' => 'confirmed', 'preferred_date' => $data['preferred_date'], 'preferred_time' => '11:30', 'internal_note' => 'Prueba transaccional'];
        $url = '/api/v1/admin/reservations/'.$row->id;
        $this->putJson($url, $update)->assertOk()->assertJsonPath('result.status', 'confirmed');
        $this->assertSame(1, DB::table('mail_deliveries')->where('deduplication_key', 'reservation:'.$row->id.':2')->count());
        $this->putJson($url, $update)->assertConflict();
        $this->putJson($url, [...$update, 'version' => 2, 'status' => 'completed'])->assertOk();
        $this->putJson($url, [...$update, 'version' => 3, 'status' => 'pending'])->assertUnprocessable();
    }
}
