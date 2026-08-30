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
        $this->baseUrl = rtrim(config('services.hianime.url', 'https://hianime-api-ten.vercel.app'), '/');
    }

    /**
     * Search anime on HiAnime to find matching anime ID/slug
     */
    public function searchAnime(string $query): ?string
    {
        $cacheKey = 'hianime_search_' . md5(strtolower(trim($query)));

        return Cache::remember($cacheKey, 86400, function () use ($query) {
            try {
                $response = Http::timeout(6)
                    ->withHeaders(['User-Agent' => 'Mozilla/5.0'])
                    ->get("{$this->baseUrl}/api/v2/hianime/search", [
                        'q' => $query,
                        'page' => 1,
                    ]);

                if ($response->successful()) {
                    $animes = $response->json()['data']['animes'] ?? [];
                    if (!empty($animes[0]['id'])) {
                        return $animes[0]['id'];
                    }
                }
            } catch (\Throwable $e) {
                Log::warning("HiAnime search error for query '{$query}': " . $e->getMessage());
            }

            // Fallback normalized slug
            return preg_replace('/[^\w-]/', '', strtolower(str_replace(' ', '-', $query)));
        });
    }

    /**
     * Get episode list for an anime on HiAnime
     */
    public function getEpisodes(string $animeId): array
    {
        $cacheKey = "hianime_episodes_{$animeId}";

        return Cache::remember($cacheKey, 3600, function () use ($animeId) {
            try {
                $response = Http::timeout(6)
                    ->withHeaders(['User-Agent' => 'Mozilla/5.0'])
                    ->get("{$this->baseUrl}/api/v2/hianime/anime/{$animeId}/episodes");

                if ($response->successful()) {
                    return $response->json()['data']['episodes'] ?? [];
                }
            } catch (\Throwable $e) {
                Log::warning("HiAnime episodes error for ID '{$animeId}': " . $e->getMessage());
            }

            return [];
        });
    }

    /**
     * Get direct streaming sources (.m3u8), subtitles (.vtt), and intro/outro for an episode
     */
    public function getEpisodeSources(string $animeEpisodeId, string $server = 'hd-1', string $category = 'sub'): ?array
    {
        $cacheKey = 'hianime_sources_' . md5("{$animeEpisodeId}_{$server}_{$category}");

        return Cache::remember($cacheKey, 1800, function () use ($animeEpisodeId, $server, $category) {
            try {
                $response = Http::timeout(8)
                    ->withHeaders(['User-Agent' => 'Mozilla/5.0'])
                    ->get("{$this->baseUrl}/api/v2/hianime/episode/sources", [
                        'animeEpisodeId' => $animeEpisodeId,
                        'server' => $server,
                        'category' => $category,
                    ]);

                if ($response->successful()) {
                    $data = $response->json()['data'] ?? null;
                    if ($data && !empty($data['sources'])) {
                        return $data;
                    }
                }
            } catch (\Throwable $e) {
                Log::warning("HiAnime sources error for Episode '{$animeEpisodeId}': " . $e->getMessage());
            }

            return null;
        });
    }

    /**
     * Resolve streaming data for an anime title and episode number
     */
    public function resolveStream(string $title, int $episodeNumber = 1, ?string $romaji = null): ?array
    {
        // 1. Find anime ID on HiAnime
        $animeId = $this->searchAnime($title) ?: ($romaji ? $this->searchAnime($romaji) : null);
        if (!$animeId) return null;

        // 2. Find episode ID
        $episodes = $this->getEpisodes($animeId);
        $targetEpisodeId = null;

        foreach ($episodes as $ep) {
            if ((int)($ep['number'] ?? 0) === $episodeNumber) {
                $targetEpisodeId = $ep['episodeId'] ?? null;
                break;
            }
        }

        if (!$targetEpisodeId && isset($episodes[$episodeNumber - 1]['episodeId'])) {
            $targetEpisodeId = $episodes[$episodeNumber - 1]['episodeId'];
        }

        if (!$targetEpisodeId) {
            $targetEpisodeId = "{$animeId}?ep={$episodeNumber}";
        }

        // 3. Resolve direct sources (m3u8 + subtitles)
        $sourcesData = $this->getEpisodeSources($targetEpisodeId);
        if ($sourcesData && !empty($sourcesData['sources'])) {
            $bestM3u8 = $sourcesData['sources'][0]['url'] ?? null;
            return [
                'type' => 'hls',
                'streamUrl' => $bestM3u8,
                'sources' => $sourcesData['sources'],
                'tracks' => $sourcesData['tracks'] ?? [],
                'intro' => $sourcesData['intro'] ?? null,
                'outro' => $sourcesData['outro'] ?? null,
                'embedUrl' => "https://megacloud.tv/embed-2/e-1/{$targetEpisodeId}",
            ];
        }

        // 4. Return MegaCloud / HiAnime direct embed player
        return [
            'type' => 'iframe',
            'streamUrl' => "https://megacloud.tv/embed-2/e-1/{$targetEpisodeId}",
            'embedUrl' => "https://megacloud.tv/embed-2/e-1/{$targetEpisodeId}",
            'sources' => [],
            'tracks' => [],
        ];
    }
}
