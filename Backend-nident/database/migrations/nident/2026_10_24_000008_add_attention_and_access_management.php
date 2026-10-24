<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedInteger('nident_auth_version')->default(1);
        });
        Schema::table('mail_deliveries', function (Blueprint $table) {
            $table->boolean('is_sandbox')->default(false);
            $table->string('transport', 20)->nullable();
        });
        foreach (['seguridad_perfil', 'seguridad_roles'] as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->unsignedInteger('nident_version')->default(1);
            });
        }
        Schema::table('web_contacto_mensaje', function (Blueprint $table) {
            $table->string('nident_reference', 30)->nullable()->unique();
        });
        foreach (DB::table('web_contacto_mensaje')->whereNotNull('nident_request_id')->orderBy('id')->cursor() as $row) {
            $reference = 'NID-'.strtoupper(substr(str_replace('-', '', $row->nident_request_id), 0, 10));
            if (DB::table('web_contacto_mensaje')->where('nident_reference', $reference)->exists()) {
                $reference = 'NID-'.strtoupper(bin2hex(random_bytes(8)));
            }DB::table('web_contacto_mensaje')->where('id', $row->id)->update(['nident_reference' => $reference]);
        }
        Schema::create('nident_claims', function (Blueprint $table) {
            $table->id();
            $table->uuid('request_id')->unique();
            $table->char('request_hash', 64);
            $table->string('reference', 30)->unique();
            $table->string('type', 20);
            $table->string('name', 150);
            $table->string('email', 180);
            $table->string('phone', 40);
            $table->string('document_type', 20);
            $table->string('document_number', 30);
            $table->string('address', 300);
            $table->boolean('minor')->default(false);
            $table->string('guardian', 180)->nullable();
            $table->string('service', 300);
            $table->decimal('amount', 12, 2)->nullable();
            $table->text('detail');
            $table->text('requested_solution');
            $table->json('attachments');
            $table->string('status', 20)->default('received');
            $table->text('response')->nullable();
            $table->unsignedBigInteger('handled_by')->nullable();
            $table->timestamp('answered_at')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
            $table->index(['status', 'created_at']);
        });
        Schema::create('nident_mail_events', function (Blueprint $table) {
            $table->id();
            $table->string('event_key', 180)->unique();
            $table->string('reference', 30)->index();
            $table->string('template_key', 80);
            $table->uuid('delivery_id')->nullable();
            $table->string('status', 30);
            $table->timestamps();
        });
        Schema::create('nident_security_audit', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('actor_id');
            $table->string('action', 50);
            $table->string('target_type', 30);
            $table->unsignedBigInteger('target_id');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nident_security_audit');
        Schema::dropIfExists('nident_mail_events');
        Schema::dropIfExists('nident_claims');
        Schema::table('web_contacto_mensaje', fn (Blueprint $table) => $table->dropColumn('nident_reference'));
        Schema::table('users',fn (Blueprint $table) => $table->dropColumn('nident_auth_version'));
        Schema::table('mail_deliveries', fn (Blueprint $table) => $table->dropColumn(['is_sandbox', 'transport']));
        foreach (['seguridad_perfil', 'seguridad_roles'] as $name) {
            Schema::table($name, fn (Blueprint $table) => $table->dropColumn('nident_version'));
        }
    }
};
