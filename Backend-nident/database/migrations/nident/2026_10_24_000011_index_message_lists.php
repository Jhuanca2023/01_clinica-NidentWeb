<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('web_contacto_mensaje', function (Blueprint $table) {
            $table->index(['nident_read_at', 'created_at', 'id'], 'nident_messages_read_created');
            $table->index(['created_at', 'id'], 'nident_messages_created');
        });
    }

    public function down(): void
    {
        Schema::table('web_contacto_mensaje', function (Blueprint $table) {
            $table->dropIndex('nident_messages_read_created');
            $table->dropIndex('nident_messages_created');
        });
    }
};
