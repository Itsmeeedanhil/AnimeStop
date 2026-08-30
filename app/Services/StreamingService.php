<?php

namespace App\Services;

class StreamingService
{
    public function __construct(
        protected HiAnimeService $hiAnimeService
    ) {}

    /**
     * Resolve streaming player data with 4animo player integration and trailer fallback
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

        // Extract MyAnimeList ID (idMal)
        $targetId = !empty($animeDetails['idMal']) ? $animeDetails['idMal'] : $animeId;

        // Fallback trailer for unreleased/upcoming titles
        $trailerEmbedUrl = $trailerId
            ? "https://www.youtube.com/embed/{$trailerId}?autoplay=1&rel=0"
            : "https://www.youtube.com/embed?listType=search&list=" . urlencode("{$title} anime official trailer");

        // Resolve streaming servers from 4animo and mirrors
        $servers = $this->hiAnimeService->resolveServers(
            $englishTitle ?? $romajiTitle ?? 'anime',
            $episode,
            $romajiTitle,
            $targetId
        );

        $defaultStreamUrl = $isUnreleased ? $trailerEmbedUrl : ($servers[0]['url'] ?? '');

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
            'streamUrl' => $defaultStreamUrl,
            'servers' => $servers,
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
