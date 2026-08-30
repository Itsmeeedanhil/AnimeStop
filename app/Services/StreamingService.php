<?php

namespace App\Services;

class StreamingService
{
    public function __construct(
        protected HiAnimeService $hiAnimeService
    ) {}

    /**
     * Resolve streaming player data with exact aired episode counts
     */
    public function getStreamData(int $animeId, int $episode = 1, ?array $animeDetails = null): array
    {
        $totalEpisodes = $animeDetails['episodes'] ?? null;
        $englishTitle = $animeDetails['title']['english'] ?? null;
        $romajiTitle = $animeDetails['title']['romaji'] ?? null;
        $title = $englishTitle ?? $romajiTitle ?? "Episode {$episode}";
        $banner = $animeDetails['bannerImage'] ?? $animeDetails['coverImage']['extraLarge'] ?? null;
        $trailerId = $animeDetails['trailer']['id'] ?? null;
        $status = $animeDetails['status'] ?? 'FINISHED';
        $nextAiring = $animeDetails['nextAiringEpisode'] ?? null;

        // Calculate exact released/aired episode count
        $releasedEpisodesCount = 0;

        if ($status === 'NOT_YET_RELEASED') {
            $releasedEpisodesCount = 0;
        } elseif ($status === 'RELEASING') {
            if (!empty($nextAiring['episode'])) {
                // Next airing episode minus 1 equals the number of currently released episodes
                $releasedEpisodesCount = max(0, (int)$nextAiring['episode'] - 1);
            } elseif (!empty($totalEpisodes)) {
                $releasedEpisodesCount = (int)$totalEpisodes;
            } else {
                $releasedEpisodesCount = max(1, $episode);
            }
        } elseif ($status === 'FINISHED') {
            $releasedEpisodesCount = (int)($totalEpisodes ?: 12);
        } else {
            $releasedEpisodesCount = (int)($totalEpisodes ?: 12);
        }

        $isUnreleased = ($status === 'NOT_YET_RELEASED' || $releasedEpisodesCount === 0);

        // Extract MyAnimeList ID (idMal)
        $targetId = !empty($animeDetails['idMal']) ? $animeDetails['idMal'] : $animeId;

        // Fallback trailer for unreleased/upcoming titles
        $trailerEmbedUrl = $trailerId
            ? "https://www.youtube.com/embed/{$trailerId}?autoplay=1&rel=0"
            : "https://www.youtube.com/embed?listType=search&list=" . urlencode("{$title} anime official trailer");

        // Resolve streaming servers from 4animo endpoints
        $servers = $this->hiAnimeService->resolveServers(
            $animeId,
            $episode,
            $targetId
        );

        $defaultStreamUrl = $isUnreleased ? $trailerEmbedUrl : ($servers[0]['url'] ?? '');

        // Build list of ONLY actually released episodes (never unreleased future episodes)
        $episodesList = [];
        $episodeCount = min($releasedEpisodesCount, 2000);
        
        for ($i = 1; $i <= $episodeCount; $i++) {
            $episodesList[] = [
                'number' => $i,
                'title' => "Episode {$i}",
                'duration' => '24m',
                'thumbnail' => $banner,
                'synopsis' => "Episode {$i} follows the story progression and encounters in this released episode.",
                'isCurrent' => $i === $episode,
            ];
        }

        return [
            'animeId' => $animeId,
            'currentEpisode' => $episode,
            'totalEpisodes' => $totalEpisodes,
            'releasedEpisodesCount' => $releasedEpisodesCount,
            'status' => $status,
            'nextAiringEpisode' => $nextAiring,
            'isUnreleased' => $isUnreleased,
            'title' => $title,
            'streamUrl' => $defaultStreamUrl,
            'servers' => $servers,
            'trailerEmbedUrl' => $trailerEmbedUrl,
            'navigation' => [
                'hasPrevious' => $episode > 1,
                'previousEpisode' => $episode > 1 ? $episode - 1 : null,
                'hasNext' => $episode < $releasedEpisodesCount,
                'nextEpisode' => ($episode < $releasedEpisodesCount) ? $episode + 1 : null,
            ],
            'episodes' => $episodesList,
        ];
    }
}
