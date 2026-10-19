<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('web_contacto_mensaje')) {
            Schema::create('web_contacto_mensaje', function (Blueprint $table) {
                $table->id();
                $table->string('nombre', 100);
                $table->string('apellido', 100)->default('');
                $table->string('email', 150);
                $table->string('asunto', 255);
                $table->string('producto_interes', 255);
                $table->date('fecha_mensaje');
                $table->string('telefono', 60)->default('');
                $table->text('mensaje');
                $table->char('email_enviado', 1)->default('N');
                $table->timestamps();
            });
        }
        Schema::table('web_contacto_mensaje', function (Blueprint $table) {
            $table->uuid('nident_request_id')->nullable()->unique();
            $table->char('nident_request_hash', 64)->nullable();
            $table->timestamp('nident_read_at')->nullable();
        });
    }

    public function down(): void
    {
        // Preserve messages and their deduplication metadata; this is a shared legacy table.
    }
};
