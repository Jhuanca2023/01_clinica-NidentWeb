<?php

namespace Tests\Nident;

use App\Models\Nident\MailSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class OperationsAccessTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        if (DB::connection()->getDatabaseName() !== 'nident_testing') {
            throw new \RuntimeException('Base de pruebas no aislada.');
        }
        MailSetting::find(1)->update(['enabled' => false]);
    }

    private function principal(): void
    {
        $user = new User(['Activo' => 'S', 'es_administrador_principal' => true]);
        $user->id = 900001;
        $this->actingAs($user, 'api');
    }

    public function test_product_creation_publishing_visibility_and_stale_versions(): void
    {
        $this->getJson('/api/v1/admin/catalog')->assertUnauthorized();
        $this->principal();
        $row = $this->getJson('/api/v1/admin/catalog')->assertOk()->json('result');
        $before = count($this->getJson('/api/v1/public/products')->assertOk()->json());
        $product = ['id' => (string) Str::uuid(), 'visible' => true, 'title' => 'Producto de prueba', 'slug' => 'producto-transaccional', 'summary' => 'Una descripción independiente.', 'price' => '12.50', 'category' => 'Higiene', 'sku' => 'QA-001', 'stock' => 4, 'image' => '', 'alt' => '', 'details' => 'Información del producto.'];
        $row['draft']['items'][] = $product;
        $saved = $this->putJson('/api/v1/admin/catalog', ['version' => $row['version'], 'document' => $row['draft']])->assertOk()->json('result');
        $this->assertCount($before, $this->getJson('/api/v1/public/products')->json());
        $this->putJson('/api/v1/admin/catalog', ['version' => $row['version'], 'document' => $row['draft']])->assertConflict();
        $published = $this->postJson('/api/v1/admin/catalog/publish', ['version' => $saved['version']])->assertOk()->json('result');
        $this->assertCount($before + 1, $this->getJson('/api/v1/public/products')->json());
        $published['draft']['items'][array_key_last($published['draft']['items'])]['price'] = '-10';
        $this->putJson('/api/v1/admin/catalog', ['version' => $published['version'], 'document' => $published['draft']])->assertUnprocessable();
        $published['draft']['items'] = array_map(fn ($item) => $item['id'] === $product['id'] ? array_replace($item, ['visible' => false, 'price' => '12.50']) : $item, $published['draft']['items']);
        $saved = $this->putJson('/api/v1/admin/catalog', ['version' => $published['version'], 'document' => $published['draft']])->assertOk()->json('result');
        $this->postJson('/api/v1/admin/catalog/publish', ['version' => $saved['version']])->assertOk();
        $this->assertCount($before, $this->getJson('/api/v1/public/products')->json());
    }

    public function test_staff_roles_profiles_and_revoked_access(): void
    {
        $this->principal();
        $role = $this->postJson('/api/v1/admin/security/roles', ['name' => 'Catálogo prueba', 'active' => true, 'require_2fa' => false, 'permissions' => ['catalog']])->assertCreated()->json('result.id');
        $profile = $this->postJson('/api/v1/admin/security/profiles', ['name' => 'Editor prueba', 'active' => true, 'role_ids' => [$role]])->assertCreated()->json('result.id');
        $payload = ['name' => 'Personal sintético', 'email' => 'synthetic-'.Str::uuid().'@example.invalid', 'active' => true, 'profile_ids' => [$profile], 'password' => 'OnlyTestPassword2026', 'password_confirmation' => 'OnlyTestPassword2026'];
        $id = $this->postJson('/api/v1/admin/security/users', $payload)->assertCreated()->json('result.id');
        $user = User::findOrFail($id);
        $this->assertTrue(Hash::check($payload['password'], $user->password));
        $this->assertFalse((bool) $user->es_administrador_principal);
        $json = $this->getJson('/api/v1/admin/security')->assertOk()->json('result');
        $this->assertArrayNotHasKey('password', $json['users'][0]);
        $this->actingAs($user, 'api');
        $this->getJson('/api/v1/admin/catalog')->assertOk();
        $this->getJson('/api/v1/admin/security')->assertForbidden();
        $this->getJson('/api/v1/admin/claims')->assertForbidden();
        $this->postJson('/api/v1/admin/security/roles', ['permissions' => ['security']])->assertForbidden();
        $this->principal();
        $this->putJson('/api/v1/admin/security/users/'.$id, ['name' => $user->name, 'email' => $user->email, 'active' => false, 'profile_ids' => [$profile], 'version' => 1])->assertOk();
        $this->assertSame(2, User::find($id)->nident_auth_version);
        $this->actingAs(User::find($id), 'api')->getJson('/api/v1/admin/catalog')->assertForbidden();
    }

    public function test_claim_receipt_idempotency_private_attachments_and_reply(): void
    {
        Storage::fake('local');
        $data = ['request_id' => (string) Str::uuid(), 'service_kind' => 'servicio', 'type' => 'reclamo', 'name' => 'Consumidor sintético', 'email' => 'claim@example.invalid', 'phone' => '999000000', 'document_type' => 'DNI', 'document_number' => '00000000', 'address' => 'Domicilio de prueba', 'minor' => false, 'service' => 'Evaluación', 'amount' => '20.00', 'detail' => 'Detalle sintético de la atención recibida.', 'requested_solution' => 'Solicito revisar la atención.', 'privacy' => true];
        $result = $this->postJson('/api/v1/public/claims', $data)->assertCreated()->assertJsonPath('result.notification.status', 'disabled')->json('result');
        $this->postJson('/api/v1/public/claims', $data)->assertCreated()->assertJsonPath('result.reference', $result['reference']);
        $this->postJson('/api/v1/public/claims', array_replace($data, ['detail' => 'Otro contenido para comprobar duplicados.']))->assertConflict();
        $this->postJson('/api/v1/public/claims', array_replace($data, ['request_id' => (string) Str::uuid(), 'minor' => true]))->assertUnprocessable();
        $this->postJson('/api/v1/public/requests/lookup', ['reference' => $result['reference'], 'email' => 'wrong@example.invalid'])->assertNotFound();
        $lookup = $this->postJson('/api/v1/public/requests/lookup', ['reference' => $result['reference'], 'email' => $data['email']])->assertOk()->json('result');
        foreach (['detail', 'email', 'name', 'response', 'attachments', 'document_number'] as $key) {
            $this->assertArrayNotHasKey($key, $lookup);
        }
        $id = DB::table('nident_claims')->where('request_id', $data['request_id'])->value('id');
        $this->getJson('/api/v1/admin/claims/'.$id.'/attachments/0')->assertUnauthorized();
        $this->principal();
        $this->putJson('/api/v1/admin/claims/'.$id, ['version' => 1, 'status' => 'answered', 'response' => 'Respuesta sintética de prueba.'])->assertOk();
        $this->putJson('/api/v1/admin/claims/'.$id, ['version' => 1, 'status' => 'reviewing'])->assertConflict();
        $this->postJson('/api/v1/public/requests/lookup', ['reference' => $result['reference'], 'email' => $data['email']])->assertJsonPath('result.status', 'answered');
        $data['request_id'] = (string) Str::uuid();
        $data['attachments'] = [UploadedFile::fake()->createWithContent('constancia.pdf', "%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF")];
        $ref = $this->post('/api/v1/public/claims', $data, ['Accept' => 'application/json'])->assertCreated()->json('result.reference');
        $row = DB::table('nident_claims')->where('reference', $ref)->first();
        $path = json_decode($row->attachments, true)[0]['path'];
        Storage::disk('local')->assertExists($path);
        $this->get('/api/v1/admin/claims/'.$row->id.'/attachments/0')->assertOk();
        $list = $this->getJson('/api/v1/admin/claims')->assertOk()->json('result.data');
        $this->assertArrayNotHasKey('path',$list[0]['attachments'][0]);
    }
}
