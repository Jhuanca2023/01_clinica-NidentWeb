<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cms_site_settings', function (Blueprint $table) {
            $table->unsignedTinyInteger('id')->primary();
            $table->json('content');
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
        });
        Schema::create('cms_pages', function (Blueprint $table) {
            $table->id();
            $table->string('path', 180)->unique();
            $table->string('source', 100);
            $table->string('title', 180);
            $table->string('description', 300)->default('');
            $table->boolean('published')->default(true);
            $table->timestamps();
        });
        Schema::create('mail_settings', function (Blueprint $table) {
            $table->unsignedTinyInteger('id')->primary();
            $table->boolean('enabled')->default(false);
            $table->string('transport', 20)->default('log');
            $table->string('from_name', 120)->default('Nident');
            $table->string('from_address', 180)->nullable();
            $table->string('reply_to', 180)->nullable();
            $table->string('contact_to', 180)->nullable();
            $table->string('host', 180)->nullable();
            $table->unsignedSmallInteger('port')->default(587);
            $table->string('encryption', 10)->default('tls');
            $table->string('username', 180)->nullable();
            $table->text('password')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
        });
        Schema::create('mail_templates', function (Blueprint $table) {
            $table->id();
            $table->string('key', 80)->unique();
            $table->string('name', 150);
            $table->json('variables');
            $table->json('draft');
            $table->json('published')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->unsignedInteger('published_version')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
        });
        Schema::create('mail_template_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('template_id')->constrained('mail_templates');
            $table->unsignedInteger('version');
            $table->json('document');
            $table->string('action', 20);
            $table->unsignedBigInteger('actor_id')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['template_id', 'version']);
        });
        Schema::create('mail_deliveries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('template_id')->constrained('mail_templates');
            $table->unsignedInteger('template_version');
            $table->text('recipient');
            $table->text('subject');
            $table->longText('html');
            $table->string('status', 20)->default('pending');
            $table->string('deduplication_key', 180)->unique();
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->timestamp('claimed_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->string('error_code', 120)->nullable();
            $table->unsignedBigInteger('requested_by')->nullable();
            $table->timestamps();
            $table->index(['status', 'created_at']);
        });
        if (! Schema::hasTable('jobs')) {
            Schema::create('jobs', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->string('queue')->index();
                $table->longText('payload');
                $table->unsignedTinyInteger('attempts');
                $table->unsignedInteger('reserved_at')->nullable();
                $table->unsignedInteger('available_at');
                $table->unsignedInteger('created_at');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('mail_deliveries');
        Schema::dropIfExists('mail_template_revisions');
        Schema::dropIfExists('mail_templates');
        Schema::dropIfExists('mail_settings');
        Schema::dropIfExists('cms_pages');
        Schema::dropIfExists('cms_site_settings');
        // jobs may belong to another module. Never remove a shared queue here.
    }
};
