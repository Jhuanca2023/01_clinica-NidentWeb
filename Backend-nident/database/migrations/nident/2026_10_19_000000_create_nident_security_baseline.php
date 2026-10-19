<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $schema = json_decode(file_get_contents(database_path('schema/nident-security.json')), true, 512, JSON_THROW_ON_ERROR);
        // Reuse the engine's security tables only when absent. No historical records are imported.
        Schema::disableForeignKeyConstraints();
        try {
            foreach ($schema['tables'] as $name => $ddl) {
                if (! Schema::hasTable($name)) {
                    DB::statement($ddl);
                }
            }
        } finally {
            Schema::enableForeignKeyConstraints();
        }
    }

    public function down(): void
    {
        // These tables can predate Nident and contain accounts. Never drop them implicitly.
    }
};
