<?php

namespace App\Services;

class HiAnimeService
{
    protected string $embedBaseUrl = 'https://cdn.4animo.xyz/embed';

    /**
     * Resolve streaming servers list directly using 4animo AniList / MAL endpoints with autoplay and ad-skip flags
     */
    public function resolveServers(int $anilistId, int $episodeNumber = 1, ?int $malId = null): array
    {
        $targetMalId = $malId ?: $anilistId;
        $adFreeParams = 'k=1&autoPlay=1&skipIntro=1&skipOutro=1';

        return [
            [
                'id' => '4animo-hd1',
                'name' => 'Server 1 (4Animo HD-1)',
                'badge' => 'HiAnime HD',
                'url' => "{$this->embedBaseUrl}/hd-1/ani/{$anilistId}/{$episodeNumber}/sub?{$adFreeParams}",
            ],
            [
                'id' => '4animo-hd2',
                'name' => 'Server 2 (4Animo HD-2)',
                'badge' => 'HiAnime HD',
                'url' => "{$this->embedBaseUrl}/hd-2/ani/{$anilistId}/{$episodeNumber}/sub?{$adFreeParams}",
            ],
            [
                'id' => '4animo-ani',
                'name' => 'Server 3 (4Animo Auto)',
                'badge' => 'Auto CDN',
                'url' => "{$this->embedBaseUrl}/ani/{$anilistId}/{$episodeNumber}/sub?{$adFreeParams}",
            ],
            [
                'id' => 'vidsrc',
                'name' => 'Server 4 (VidSrc)',
                'badge' => '1080p',
                'url' => "https://vidsrc.me/embed/anime?id={$targetMalId}&ep={$episodeNumber}",
            ],
            [
                'id' => 'twoembed',
                'name' => 'Server 5 (2Embed)',
                'badge' => 'Multi-Sub',
                'url' => "https://2embed.cc/embed/anime/{$targetMalId}/{$episodeNumber}",
            ],
        ];
    }
}
