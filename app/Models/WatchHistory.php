<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WatchHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'session_id',
        'user_id',
        'anime_id',
        'anime_title',
        'image_url',
        'banner_url',
        'episode_number',
        'episode_title',
        'progress_seconds',
        'duration_seconds',
        'completed',
        'last_watched_at',
    ];

    protected $casts = [
        'anime_id' => 'integer',
        'episode_number' => 'integer',
        'progress_seconds' => 'integer',
        'duration_seconds' => 'integer',
        'completed' => 'boolean',
        'last_watched_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

