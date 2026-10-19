<?php

namespace Tests\Nident;

use App\Models\User;
use Database\Seeders\NidentCollectionsSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class CollectionsDashboardTest extends TestCase
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

    private function collection(string $key): array
    {
        return $this->getJson('/api/v1/admin/site/collections/'.$key)->assertOk()->json('result');
    }

    private function save(string $key, array $row): array
    {
        return $this->putJson('/api/v1/admin/site/collections/'.$key, ['version' => $row['version'], 'document' => $row['draft']])->assertOk()->json('result');
    }

    private function publish(string $key, array $row): array
    {
        return $this->postJson('/api/v1/admin/site/collections/'.$key.'/publish', ['version' => $row['version']])->assertOk()->json('result');
    }

    public function test_collection_permissions_are_enforced(): void
    {
        $this->getJson('/api/v1/admin/site/collections/reviews')->assertUnauthorized();
        $this->getJson('/api/v1/admin/dashboard')->assertUnauthorized();
        $user = new User(['Activo' => 'S', 'es_administrador_principal' => false]);
        $user->id = 900002;
        $this->actingAs($user, 'api');
        $this->getJson('/api/v1/admin/site/collections/plans')->assertForbidden();
        $dashboard = $this->getJson('/api/v1/admin/dashboard')->assertOk();
        foreach (['reservations', 'messages', 'mail', 'content'] as $key) {
            $dashboard->assertJsonPath('result.'.$key, null);
        }
    }

    public function test_review_create_order_hide_delete_and_empty_publication(): void
    {
        $this->principal();
        $row = $this->collection('reviews');
        $initial = count($row['published']['items']);
        $review = ['id' => (string) Str::uuid(), 'visible' => true, 'author' => 'Persona sintética', 'service' => 'Evaluación', 'quote' => 'Reseña de prueba <script>alert(1)</script>', 'rating' => 4, 'image' => '', 'alt' => '', 'note' => 'Prueba transaccional'];
        array_unshift($row['draft']['items'], $review);
        $old = $row;
        $row = $this->save('reviews', $row);
        $this->assertCount($initial, $this->getJson('/api/v1/public/site')->assertOk()->json('result.collections.reviews.items'));
        $this->putJson('/api/v1/admin/site/collections/reviews', ['version' => $old['version'], 'document' => $old['draft']])->assertConflict();
        $row = $this->publish('reviews', $row);
        $this->getJson('/api/v1/public/site')->assertJsonPath('result.collections.reviews.items.0.id', $review['id']);
        $row['draft']['items'][0]['visible'] = false;
        $row = $this->publish('reviews', $this->save('reviews', $row));
        $this->assertCount($initial, $this->getJson('/api/v1/public/site')->json('result.collections.reviews.items'));
        array_shift($row['draft']['items']);
        $row = $this->publish('reviews', $this->save('reviews', $row));
        $this->assertCount($initial, $row['published']['items']);
        $row['draft']['items'] = [];
        $this->publish('reviews', $this->save('reviews', $row));
        $this->getJson('/api/v1/public/site')->assertJsonPath('result.collections.reviews.items', []);
    }

    public function test_plans_allow_independent_sections_and_keep_published_urls(): void
    {
        $this->principal();
        $row = $this->collection('plans');
        $plan = $row['draft']['items'][0];
        $plan['id'] = (string) Str::uuid();
        $plan['slug'] = 'plan-independiente';
        $plan['title'] = 'Plan de prueba';
        $plan['features'] = ['Una inclusión propia'];
        $plan['sections'] = [['title' => 'Cómo funciona', 'body' => 'Información personalizada.'], ['title' => 'Antes de la visita', 'body' => 'Otra sección distinta.']];
        $row['draft']['items'][] = $plan;
        $row = $this->publish('plans', $this->save('plans', $row));
        $public = $this->getJson('/api/v1/public/site')->assertOk()->json('result.collections.plans.items');
        $found = collect($public)->firstWhere('id', $plan['id']);
        $this->assertEquals($plan['sections'], $found['sections']);
        $this->assertSame($plan['features'], $found['features']);
        $row['draft']['items'][count($row['draft']['items']) - 1]['slug'] = 'otro-enlace';
        $this->putJson('/api/v1/admin/site/collections/plans', ['version' => $row['version'], 'document' => $row['draft']])->assertUnprocessable();
    }

    public function test_collection_validation_rejects_unsafe_or_duplicate_content(): void
    {
        $this->principal();
        $row = $this->collection('plans');
        $row['draft']['items'][1]['slug'] = $row['draft']['items'][0]['slug'];
        $this->putJson('/api/v1/admin/site/collections/plans', ['version' => $row['version'], 'document' => $row['draft']])->assertUnprocessable();
        $row = $this->collection('reviews');
        $row['draft']['items'][0]['image'] = 'javascript:alert(1)';
        $this->putJson('/api/v1/admin/site/collections/reviews', ['version' => $row['version'], 'document' => $row['draft']])->assertUnprocessable();
        $row = $this->collection('reviews');
        $row['draft']['items'][0]['rating'] = 6;
        $this->putJson('/api/v1/admin/site/collections/reviews', ['version' => $row['version'], 'document' => $row['draft']])->assertUnprocessable();
        $row = $this->collection('reviews');
        $row['draft']['items'] = ['key' => $row['draft']['items'][0]];
        $this->putJson('/api/v1/admin/site/collections/reviews', ['version' => $row['version'], 'document' => $row['draft']])->assertUnprocessable();
    }

    public function test_collection_bootstrap_preserves_old_canvas_edits_and_is_idempotent(): void
    {
        $seed = json_decode(file_get_contents(database_path('seeders/data/nident-collections.json')), true);
        preg_match('/nident:([a-z0-9-]+)/', $seed['reviews']['bindings']['items.0.author'], $match);
        $field = $match[1];
        $module = DB::table('cms_modules')->where('key', 'inicio')->first();
        $draft = json_decode($module->draft, true);
        $published = json_decode($module->published, true);
        $draft[$field] = 'Nombre en borrador';
        $published[$field] = 'Nombre publicado';
        DB::table('cms_modules')->where('key', 'inicio')->update(['draft' => json_encode($draft), 'published' => json_encode($published)]);
        DB::table('cms_collections')->where('key', 'reviews')->delete();
        $this->seed(NidentCollectionsSeeder::class);
        $row = DB::table('cms_collections')->where('key', 'reviews')->first();
        $this->assertSame('Nombre en borrador', json_decode($row->draft, true)['items'][0]['author']);
        $this->assertSame('Nombre publicado', json_decode($row->published, true)['items'][0]['author']);
        $this->seed(NidentCollectionsSeeder::class);
        $this->assertSame($row->draft, DB::table('cms_collections')->where('key', 'reviews')->value('draft'));
    }

    public function test_dashboard_uses_real_counts_and_zero_filled_series(): void
    {
        for ($i = 0; $i < 3; $i++) {
            $id = (string) Str::uuid();
            $this->postJson('/api/v1/public/reservations', ['request_id' => $id, 'name' => 'Paciente sintético', 'email' => 'synthetic@example.invalid', 'phone' => '999123456', 'treatment' => 'Evaluación', 'branch' => 'Por coordinar', 'preferred_date' => now()->addDays(3)->toDateString(), 'preferred_time' => '10:30', 'privacy' => true])->assertCreated();
            if ($i === 0) {
                DB::table('nident_reservations')->where('request_id', $id)->update(['created_at' => now()->subDay()]);
            }if ($i === 2) {
                DB::table('nident_reservations')->where('request_id', $id)->update(['status' => 'confirmed', 'preferred_date' => today()->toDateString()]);
            }
        }
        $this->principal();
        $result = $this->getJson('/api/v1/admin/dashboard?days=7')->assertOk()->assertJsonPath('result.reservations.total', 3)->assertJsonPath('result.reservations.pending', 2)->assertJsonPath('result.reservations.today', 1)->json('result');
        $this->assertCount(7, $result['reservations']['series']);
        $this->assertSame(3, array_sum(array_column($result['reservations']['series'], 'total')));
        $this->assertCount(1,$result['reservations']['upcoming']);
        $this->assertArrayNotHasKey('email',$result['reservations']['upcoming'][0]);
        $this->getJson('/api/v1/admin/dashboard?days=1000')->assertUnprocessable();
    }
}
