<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class HiAnimeService
{
    protected string $baseUrl;

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
                $response = Http::timeout(4)
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
                Log::warning("HiAnime search error for query '{$query}': " . $e->getMessage());
            }

            // Standard fallback normalized slug
            return preg_replace('/[^\w-]/', '', strtolower(str_replace(' ', '-', $query)));
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
                $response = Http::timeout(4)
                    ->withHeaders(['User-Agent' => 'Mozilla/5.0'])
                    ->get("{$this->baseUrl}/api/v2/episodes/{$animeId}");

                if ($response->successful()) {
                    $json = $response->json();
                    return $json['data'] ?? $json ?? [];
                }
            } catch (\Throwable $e) {
                Log::warning("HiAnime episodes error for ID '{$animeId}': " . $e->getMessage());
            }

            return [];
        });
    }

    /**
     * Resolve streaming player URL for an anime title and episode number
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

        if ($targetEpisodeId) {
            // Replace :: with ?ep= if formatted by hianime-api
            $cleanEpId = str_replace('::', '?ep=', $targetEpisodeId);
            return "https://megacloud.tv/embed-2/e-1/{$cleanEpId}";
        }

        // Standard developer fallback
        $targetId = $malId ?: 1;
        return "https://2embed.cc/embed/anime/{$targetId}/{$episodeNumber}";
    }
}
