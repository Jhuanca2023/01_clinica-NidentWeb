<?php

use App\Services\Nident\ContentCopy;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function () {
            $row = DB::table('cms_collections')->where('key', 'plans')->lockForUpdate()->first();
            if (! $row) {
                return;
            }
            $updates = [];
            foreach (['draft', 'published'] as $state) {
                $document = json_decode($row->$state, true);
                $updated = ContentCopy::normalizePlans($document);
                if ($updated !== $document) {
                    $updates[$state] = json_encode($updated, JSON_UNESCAPED_UNICODE);
                }
            }
            if ($updates) {
                DB::table('cms_collections')->where('key', 'plans')->update($updates + ['version' => $row->version + 1, 'updated_at' => now()]);
            }
        });
    }

    public function down(): void
    {
        // The corrected copy describes the active booking flow; rollback keeps it.
    }
};
