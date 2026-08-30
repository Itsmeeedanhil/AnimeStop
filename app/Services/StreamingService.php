<?php

namespace App\Services;

class StreamingService
{
    public function __construct(
        protected HiAnimeService $hiAnimeService
    ) {}

    /**
     * Resolve single direct streaming player exclusively via HiAnime API (ryanwtf7/hianime-api)
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

        // Resolve stream via HiAnime API scraper
        $hiAnimeData = $this->hiAnimeService->resolveStream(
            $englishTitle ?? $romajiTitle ?? 'anime',
            $episode,
            $romajiTitle
        );

        $streamUrl = $hiAnimeData['streamUrl'] ?? "https://megacloud.tv/embed-2/e-1/{$animeId}?ep={$episode}";
        $embedUrl = $hiAnimeData['embedUrl'] ?? $streamUrl;
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
            'streamUrl' => $embedUrl,
            'directHls' => $hiAnimeData['type'] === 'hls' ? $streamUrl : null,
            'tracks' => $hiAnimeData['tracks'] ?? [],
            'intro' => $hiAnimeData['intro'] ?? [
                'start' => 0,
                'end' => 85,
            ],
            'outro' => $hiAnimeData['outro'] ?? [
                'start' => 1350,
                'end' => 1440,
            ],
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
