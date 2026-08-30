<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class HiAnimeService
{
    protected string $baseUrl;
    protected string $embedBaseUrl = 'https://cdn.4animo.xyz/api/embed';

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.hianime.url', 'http://localhost:5000'), '/');
    }

    /**
     * Search anime on HiAnime (ryanwtf7/hianime-api)
     */
    public function searchAnime(string $query): ?string
    {
        $cacheKey = 'hianime_search_' . md5(strtolower(trim($query)));

        return Cache::remember($cacheKey, 86400, function () use ($query) {
            try {
                $response = Http::timeout(3)
                    ->withHeaders(['User-Agent' => 'Mozilla/5.0'])
                    ->get("{$this->baseUrl}/api/v2/search", [
                        'q' => $query,
                    ]);

                if ($response->successful()) {
                    $json = $response->json();
                    $animes = $json['data']['animes'] ?? $json['animes'] ?? $json['data'] ?? [];
                    if (!empty($animes[0]['id'])) {
                        return $animes[0]['id'];
                    }
                }
            } catch (\Throwable $e) {
                Log::info("HiAnime API not available locally on {$this->baseUrl}");
            }

            return null;
        });
    }

    /**
     * Get episode list for an anime from ryanwtf7/hianime-api
     */
    public function getEpisodes(string $animeId): array
    {
        $cacheKey = "hianime_episodes_{$animeId}";

        return Cache::remember($cacheKey, 3600, function () use ($animeId) {
            try {
                $response = Http::timeout(3)
                    ->withHeaders(['User-Agent' => 'Mozilla/5.0'])
                    ->get("{$this->baseUrl}/api/v2/episodes/{$animeId}");

                if ($response->successful()) {
                    $json = $response->json();
                    return $json['data'] ?? $json ?? [];
                }
            } catch (\Throwable $e) {
                Log::info("HiAnime episodes error for {$animeId}");
            }

            return [];
        });
    }

    /**
     * Resolve streaming player URL using dynamic parameters from API and the official 4animo player embed
     */
    public function resolveStream(string $title, int $episodeNumber = 1, ?string $romaji = null, ?int $malId = null): string
    {
        $animeId = $this->searchAnime($title) ?: ($romaji ? $this->searchAnime($romaji) : null);
        $targetEpisodeId = null;

        if ($animeId) {
            $episodes = $this->getEpisodes($animeId);
            foreach ($episodes as $ep) {
                if ((int)($ep['episodeNumber'] ?? $ep['number'] ?? 0) === $episodeNumber) {
                    $targetEpisodeId = $ep['id'] ?? $ep['episodeId'] ?? null;
                    break;
                }
            }
        }

        $server = 'hd-1';
        $category = 'sub';
        $targetId = $targetEpisodeId ?: ($malId ?: $episodeNumber);

        // Clean target ID if slug format
        if (is_string($targetId) && str_contains($targetId, '?ep=')) {
            $parts = explode('?ep=', $targetId);
            $targetId = $parts[1] ?? $targetId;
        } elseif (is_string($targetId) && str_contains($targetId, '::')) {
            $parts = explode('::', $targetId);
            $targetId = $parts[1] ?? $targetId;
        }

        // Official 4animo external player embed
        return "{$this->embedBaseUrl}/{$server}/{$targetId}/{$category}?k=1&autoPlay=1&skipIntro=1&skipOutro=1";
    }
}
