<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('watchlists', function (Blueprint $table) {
            $table->id();
            $table->string('session_id')->nullable()->index();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedBigInteger('anime_id')->index();
            $table->string('title');
            $table->string('image_url')->nullable();
            $table->string('banner_url')->nullable();
            $table->json('genres')->nullable();
            $table->string('format')->nullable();
            $table->integer('episodes_count')->nullable();
            $table->decimal('score', 4, 1)->nullable();
            $table->timestamps();

            $table->unique(['session_id', 'anime_id']);
        });

        Schema::create('watch_histories', function (Blueprint $table) {
            $table->id();
            $table->string('session_id')->nullable()->index();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedBigInteger('anime_id')->index();
            $table->string('anime_title');
            $table->string('image_url')->nullable();
            $table->string('banner_url')->nullable();
            $table->integer('episode_number')->default(1);
            $table->string('episode_title')->nullable();
            $table->integer('progress_seconds')->default(0);
            $table->integer('duration_seconds')->default(0);
            $table->boolean('completed')->default(false);
            $table->timestamp('last_watched_at')->useCurrent();
            $table->timestamps();

            $table->index(['session_id', 'anime_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('watch_histories');
        Schema::dropIfExists('watchlists');
    }
};

