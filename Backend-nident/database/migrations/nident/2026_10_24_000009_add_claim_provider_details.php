<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nident_business_settings', function (Blueprint $table) {
            $table->unsignedTinyInteger('id')->primary();
            $table->string('commercial_name', 120)->default('Nident');
            $table->string('legal_name', 180)->default('');
            $table->string('tax_id', 11)->default('');
            $table->string('address', 300)->default('');
            $table->string('email', 180)->default('');
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
        });
        DB::table('nident_business_settings')->insert(['id' => 1, 'commercial_name' => 'Nident', 'created_at' => now(), 'updated_at' => now()]);
        Schema::table('nident_claims', function (Blueprint $table) {
            $table->string('service_kind', 20)->default('servicio');
            $table->string('guardian_email', 180)->nullable();
            $table->string('guardian_phone', 40)->nullable();
            $table->string('guardian_address', 300)->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nident_business_settings');
        Schema::table('nident_claims', fn (Blueprint $table) => $table->dropColumn(['service_kind', 'guardian_email', 'guardian_phone', 'guardian_address']));
    }
};
