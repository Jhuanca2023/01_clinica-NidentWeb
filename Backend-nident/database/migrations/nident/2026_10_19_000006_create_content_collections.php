<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cms_collections', function (Blueprint $table) {
            $table->string('key', 40)->primary();
            $table->json('draft');
            $table->json('published');
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
        });
        Schema::create('cms_collection_revisions', function (Blueprint $table) {
            $table->id();
            $table->string('collection_key', 40);
            $table->unsignedInteger('version');
            $table->json('content');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->timestamp('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cms_collection_revisions');
        Schema::dropIfExists('cms_collections');
    }
};
