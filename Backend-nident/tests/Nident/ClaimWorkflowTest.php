<?php

namespace Tests\Nident;

use App\Models\Nident\MailSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class ClaimWorkflowTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        if (DB::connection()->getDatabaseName() !== 'nident_testing') {
            throw new \RuntimeException('Base no aislada.');
        }MailSetting::find(1)->update(['enabled' => false]);
    }

    private function principal(): void
    {
        $user = new User(['Activo' => 'S', 'es_administrador_principal' => true]);
        $user->id = 900001;
        $this->actingAs($user, 'api');
    }

    private function claim(array $overrides = []): array
    {
        $payload = ['request_id' => (string) Str::uuid(), 'type' => 'queja', 'name' => 'Consumidor sintético', 'email' => 'consumer@example.invalid', 'phone' => '999000001', 'document_type' => 'DNI', 'document_number' => '00000000', 'address' => 'Domicilio de prueba', 'department' => 'La Libertad', 'province' => 'Trujillo', 'district' => 'Trujillo', 'minor' => false, 'service' => 'Evaluación', 'detail' => 'Detalle sintético para verificar el flujo.', 'requested_solution' => 'Solicito una revisión.', 'privacy' => true];
        $result = $this->postJson('/api/v1/public/claims', array_replace($payload, $overrides))->assertCreated()->json('result');

        return (array) DB::table('nident_claims')->where('reference', $result['reference'])->first();
    }

    public function test_open_is_explicit_idempotent_and_visible_to_customer_with_terminal_result(): void
    {
        $claim = $this->claim();
        $id = $claim['id'];
        $lookup = ['reference' => $claim['reference'], 'email' => $claim['email']];
        $this->getJson('/api/v1/admin/claims/'.$id)->assertUnauthorized();
        $this->postJson('/api/v1/admin/claims/'.$id.'/open')->assertUnauthorized();
        $this->principal();
        $this->getJson('/api/v1/admin/claims/'.$id)->assertOk()->assertJsonPath('result.status', 'received');
        $this->assertSame('received', DB::table('nident_claims')->where('id', $id)->value('status'));
        $opened = $this->postJson('/api/v1/admin/claims/'.$id.'/open')->assertOk()->assertJsonPath('result.status', 'reviewing')->assertJsonPath('result.version', 2)->json('result');
        $this->assertNotNull($opened['reviewing_at']);
        $this->postJson('/api/v1/admin/claims/'.$id.'/open')->assertOk()->assertJsonPath('result.version', 2);
        $this->assertSame(1, DB::table('nident_claim_history')->where('claim_id', $id)->where('status', 'reviewing')->count());
        $this->postJson('/api/v1/public/requests/lookup', $lookup)->assertOk()->assertJsonPath('result.status', 'reviewing');
        $this->putJson('/api/v1/admin/claims/'.$id, ['version' => 1, 'status' => 'answered', 'response' => 'Respuesta de prueba.'])->assertConflict();
        $this->putJson('/api/v1/admin/claims/'.$id, ['version' => 2, 'status' => 'received'])->assertUnprocessable();
        $this->putJson('/api/v1/admin/claims/'.$id, ['version' => 2, 'status' => 'reviewing', 'responsible_name' => 'Equipo de prueba', 'response' => 'Comentario interno de revisión.'])->assertOk();
        $this->assertArrayNotHasKey('response', $this->postJson('/api/v1/public/requests/lookup', $lookup)->assertOk()->json('result'));
        $this->putJson('/api/v1/admin/claims/'.$id, ['version' => 3, 'status' => 'answered', 'outcome' => 'rejected', 'responsible_name' => 'Equipo de prueba', 'response' => 'Respuesta final al consumidor.'])->assertOk();
        $this->postJson('/api/v1/public/requests/lookup', $lookup)->assertOk()->assertJsonPath('result.outcome', 'rejected')->assertJsonPath('result.response', 'Respuesta final al consumidor.');
        $this->postJson('/api/v1/public/requests/lookup', array_replace($lookup, ['email' => 'wrong@example.invalid']))->assertNotFound();
        $this->postJson('/api/v1/admin/claims/'.$id.'/open')->assertOk()->assertJsonPath('result.status', 'answered')->assertJsonPath('result.version', 4);
        $this->putJson('/api/v1/admin/claims/'.$id, ['version' => 4, 'status' => 'reviewing'])->assertUnprocessable();
    }

    public function test_list_filters_and_pages_are_processed_in_backend(): void
    {
        $tag = 'filter-'.Str::uuid();
        for ($i = 0; $i < 18; $i++) {
            $this->claim(['name' => 'Persona '.$tag, 'email' => 'filter-'.$i.'@example.invalid', 'type' => $i < 16 ? 'reclamo' : 'queja']);
        }$this->principal();
        $result = $this->getJson('/api/v1/admin/claims?'.http_build_query(['search' => $tag, 'type' => 'reclamo', 'per_page' => 15, 'page' => 2]))->assertOk()->assertJsonPath('result.total', 16)->assertJsonPath('result.current_page', 2)->json('result');
        $this->assertCount(1, $result['data']);
        $row = $result['data'][0];
        $this->assertArrayNotHasKey('request_hash', $row);
        $this->getJson('/api/v1/admin/claims?search='.$row['number'])->assertOk()->assertJsonPath('result.total', 1);
        $this->getJson('/api/v1/admin/claims?per_page=5000')->assertUnprocessable();
        $this->getJson('/api/v1/admin/claims?type=other')->assertUnprocessable();
        $user = new User(['Activo' => 'S', 'es_administrador_principal' => false]);
        $user->id = 900002;
        $this->actingAs($user, 'api')->postJson('/api/v1/admin/claims/'.$row['id'].'/open')->assertForbidden();
    }
}
