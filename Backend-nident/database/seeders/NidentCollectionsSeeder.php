<?php

namespace Database\Seeders;

use App\Services\Nident\ContentCopy;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class NidentCollectionsSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [];
        foreach (json_decode(file_get_contents(__DIR__.'/data/nident-canvas.json'), true) as $module) {
            foreach ($module['fields'] as $field) {
                $defaults[$field['id']] = $field['value'];
            }
        }
        $modules = DB::table('cms_modules')->get();
        foreach (json_decode(file_get_contents(__DIR__.'/data/nident-collections.json'), true) as $key => $seed) {
            if (DB::table('cms_collections')->where('key', $key)->exists()) {
                continue;
            }
            $documents = [];
            foreach (['draft', 'published'] as $state) {
                $values = $defaults;
                foreach ($modules as $module) {
                    $values = array_replace($values, json_decode($module->$state, true));
                }
                $document = ['items' => $seed['items']];
                foreach ($seed['bindings'] as $path => $source) {
                    data_set($document, $path, preg_replace_callback('/\{\{nident:([a-z0-9-]+)\}\}/', fn ($match) => $values[$match[1]] ?? '', $source));
                }
                if ($key === 'plans') {
                    $document = ContentCopy::normalizePlans($document);
                }
                $documents[$state] = json_encode($document, JSON_UNESCAPED_UNICODE);
            }
            DB::table('cms_collections')->insertOrIgnore(['key' => $key, ...$documents, 'version' => 1, 'created_at' => now(), 'updated_at' => now()]);
        }
    }
}
