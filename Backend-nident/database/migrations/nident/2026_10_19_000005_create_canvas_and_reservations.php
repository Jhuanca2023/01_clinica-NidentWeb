<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cms_modules', function (Blueprint $table) {
            $table->string('key', 100)->primary();
            $table->json('draft');
            $table->json('published');
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
        });
        Schema::create('cms_module_revisions', function (Blueprint $table) {
            $table->id();
            $table->string('module_key', 100);
            $table->unsignedInteger('version');
            $table->json('content');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->timestamp('created_at');
        });
        Schema::create('nident_reservations', function (Blueprint $table) {
            $table->id();
            $table->uuid('request_id')->unique();
            $table->char('request_hash', 64);
            $table->string('code', 30)->unique();
            $table->string('name', 120);
            $table->string('email', 180);
            $table->string('phone', 40);
            $table->string('treatment', 120);
            $table->string('branch', 120);
            $table->date('preferred_date');
            $table->string('preferred_time', 5);
            $table->string('status', 20)->default('pending');
            $table->text('internal_note')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
            $table->index(['status', 'preferred_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nident_reservations');
        Schema::dropIfExists('cms_module_revisions');
        Schema::dropIfExists('cms_modules');
    }
};
