<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Watchlist extends Model
{
    use HasFactory;

    protected $fillable = [
        'session_id',
        'user_id',
        'anime_id',
        'title',
        'image_url',
        'banner_url',
        'genres',
        'format',
        'episodes_count',
        'score',
    ];

    protected $casts = [
        'genres' => 'array',
        'anime_id' => 'integer',
        'episodes_count' => 'integer',
        'score' => 'float',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

