<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class StreamingService
{
    protected string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.megaplays.url', 'https://megaplays.se'), '/');
    }

    /**
     * Generate normalized anime slug
     */
    public function generateSlug(string $title): string
    {
        $clean = preg_replace('/[^\w\s-]/', '', strtolower($title));
        $clean = preg_replace('/[\s_-]+/', '-', $clean);
        return trim($clean, '-');
    }

    /**
     * Dynamically resolve MegaPlay internal video hash ID for an episode from https://megaplays.se/
     */
    public function resolveMegaPlayStream(string $title, int $episode = 1, ?string $romaji = null): string
    {
        $slug = $this->generateSlug($title);
        $romajiSlug = $romaji ? $this->generateSlug($romaji) : $slug;
        $cacheKey = 'megaplays_stream_' . md5("{$slug}_{$episode}");

        return Cache::remember($cacheKey, 3600, function () use ($title, $episode, $slug, $romajiSlug, $romaji) {
            $normalizedTitle = strtolower(preg_replace('/[^\w\s]/', '', $title));
            $normalizedRomaji = $romaji ? strtolower(preg_replace('/[^\w\s]/', '', $romaji)) : null;

            try {
                // Query MegaPlay dynamic index for the exact video hash ID
                $response = Http::timeout(4)
                    ->withHeaders(['User-Agent' => 'Mozilla/5.0'])
                    ->get("{$this->baseUrl}/", ['ajax' => 'grid', 'page' => 1]);

                if ($response->successful()) {
                    $episodes = $response->json()['episodes'] ?? [];

                    foreach ($episodes as $ep) {
                        $epName = strtolower(preg_replace('/[^\w\s]/', '', $ep['anime_name'] ?? ''));
                        $epNum = (int)($ep['episode_number'] ?? 0);

                        if ($epNum === $episode) {
                            if (str_contains($epName, $normalizedTitle) || str_contains($normalizedTitle, $epName)) {
                                return "{$this->baseUrl}/e/{$ep['slug']}";
                            }
                            if ($normalizedRomaji && (str_contains($epName, $normalizedRomaji) || str_contains($normalizedRomaji, $epName))) {
                                return "{$this->baseUrl}/e/{$ep['slug']}";
                            }
                        }
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('MegaPlays Crawler Exception: ' . $e->getMessage());
            }

            // Direct MegaPlay embed URL
            return "{$this->baseUrl}/e/{$slug}-{$episode}";
        });
    }

    /**
     * Resolve single direct streaming player exclusively from https://megaplays.se/
     */
    public function getStreamData(int $animeId, int $episode = 1, ?array $animeDetails = null): array
    {
        $totalEpisodes = $animeDetails['episodes'] ?? 24;
        $englishTitle = $animeDetails['title']['english'] ?? null;
        $romajiTitle = $animeDetails['title']['romaji'] ?? null;
        $title = $englishTitle ?? $romajiTitle ?? "Episode {$episode}";
        $banner = $animeDetails['bannerImage'] ?? $animeDetails['coverImage']['extraLarge'] ?? null;
        $trailerId = $animeDetails['trailer']['id'] ?? null;
        $status = $animeDetails['status'] ?? 'FINISHED';
        $isUnreleased = ($status === 'NOT_YET_RELEASED' || $totalEpisodes === 0 || empty($animeDetails['episodes']));

        // Resolve direct stream exclusively from https://megaplays.se/
        $streamUrl = $this->resolveMegaPlayStream(
            $englishTitle ?? $romajiTitle ?? 'anime',
            $episode,
            $romajiTitle
        );
        
        $trailerEmbedUrl = $trailerId ? "https://www.youtube.com/embed/{$trailerId}?autoplay=1&rel=0" : null;

        // Build list of episodes
        $episodesList = [];
        $episodeCount = $totalEpisodes > 0 ? min($totalEpisodes, 2000) : ($isUnreleased ? 0 : 24);
        
        for ($i = 1; $i <= $episodeCount; $i++) {
            $episodesList[] = [
                'number' => $i,
                'title' => "Episode {$i}",
                'duration' => '24m',
                'thumbnail' => $banner,
                'synopsis' => "Episode {$i} follows the story progression, encounters, and character development in this episode.",
                'isCurrent' => $i === $episode,
            ];
        }

        return [
            'animeId' => $animeId,
            'currentEpisode' => $episode,
            'totalEpisodes' => $totalEpisodes,
            'status' => $status,
            'isUnreleased' => $isUnreleased,
            'title' => $title,
            'streamUrl' => $streamUrl,
            'trailerEmbedUrl' => $trailerEmbedUrl,
            'navigation' => [
                'hasPrevious' => $episode > 1,
                'previousEpisode' => $episode > 1 ? $episode - 1 : null,
                'hasNext' => $totalEpisodes ? $episode < $totalEpisodes : true,
                'nextEpisode' => $episode + 1,
            ],
            'episodes' => $episodesList,
        ];
    }
}
