<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Simulation must not write recipients or message content into application logs.
        DB::table('mail_settings')->where('transport', 'log')->update(['transport' => 'array', 'updated_at' => now()]);
    }

    public function down(): void
    { /* Preserve the safer transport on rollback. */
    }
};
