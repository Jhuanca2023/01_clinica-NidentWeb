<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('nident_claims', function (Blueprint $table) {
            $table->string('department', 100)->nullable();
            $table->string('province', 100)->nullable();
            $table->string('district', 100)->nullable();
            $table->string('responsible_name', 150)->nullable();
            $table->string('outcome', 20)->nullable();
            $table->timestamp('reviewing_at')->nullable();
            $table->index(['type', 'status', 'created_at'], 'nident_claims_type_status_date');
        });
        Schema::create('nident_claim_history', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('claim_id')->index();
            $table->string('status', 20);
            $table->string('outcome', 20)->nullable();
            $table->unsignedBigInteger('actor_id')->nullable();
            $table->unsignedInteger('version');
            $table->timestamp('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nident_claim_history');
        Schema::table('nident_claims', function (Blueprint $table) {
            $table->dropIndex('nident_claims_type_status_date');
            $table->dropColumn(['department', 'province', 'district', 'responsible_name', 'outcome', 'reviewing_at']);
        });
    }
};
