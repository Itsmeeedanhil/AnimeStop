<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AnimeService
{
    protected string $apiUrl = 'https://graphql.anilist.co';

    /**
     * Execute a GraphQL query against AniList API with caching
     */
    public function query(string $query, array $variables = [], int $cacheTtl = 3600): array
    {
        $cacheKey = 'anilist_' . md5($query . serialize($variables));

        return Cache::remember($cacheKey, $cacheTtl, function () use ($query, $variables) {
            try {
                $response = Http::timeout(10)
                    ->withHeaders([
                        'Content-Type' => 'application/json',
                        'Accept' => 'application/json',
                    ])
                    ->post($this->apiUrl, [
                        'query' => $query,
                        'variables' => $variables,
                    ]);

                if ($response->successful()) {
                    $json = $response->json();
                    return $json['data'] ?? [];
                }

                Log::error('AniList API Error: ' . $response->body());
                return [];
            } catch (\Exception $e) {
                Log::error('AniList Connection Error: ' . $e->getMessage());
                return [];
            }
        });
    }

    /**
     * Get aggregated home page feed
     */
    public function getHomeFeed(): array
    {
        $query = '
        query {
            spotlight: Page(page: 1, perPage: 6) {
                media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
                    id
                    idMal
                    title { romaji english native }
                    bannerImage
                    coverImage { extraLarge large }
                    description(asHtml: false)
                    averageScore
                    popularity
                    episodes
                    seasonYear
                    season
                    status
                    format
                    genres
                    nextAiringEpisode { episode airingAt timeUntilAiring }
                    trailer { id site thumbnail }
                }
            }
            trending: Page(page: 1, perPage: 16) {
                media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
                    id
                    idMal
                    title { romaji english }
                    coverImage { extraLarge large }
                    bannerImage
                    averageScore
                    episodes
                    status
                    format
                    seasonYear
                    genres
                    nextAiringEpisode { episode airingAt timeUntilAiring }
                }
            }
            topAiring: Page(page: 1, perPage: 16) {
                media(status: RELEASING, sort: TRENDING_DESC, type: ANIME, isAdult: false) {
                    id
                    idMal
                    title { romaji english }
                    coverImage { extraLarge large }
                    bannerImage
                    averageScore
                    episodes
                    status
                    format
                    seasonYear
                    genres
                    nextAiringEpisode { episode airingAt timeUntilAiring }
                }
            }
            popularAllTime: Page(page: 1, perPage: 16) {
                media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
                    id
                    idMal
                    title { romaji english }
                    coverImage { extraLarge large }
                    bannerImage
                    averageScore
                    episodes
                    status
                    format
                    seasonYear
                    genres
                    nextAiringEpisode { episode airingAt timeUntilAiring }
                }
            }
            actionHighlights: Page(page: 1, perPage: 12) {
                media(genre: "Action", sort: TRENDING_DESC, type: ANIME, isAdult: false) {
                    id
                    idMal
                    title { romaji english }
                    coverImage { extraLarge large }
                    bannerImage
                    averageScore
                    episodes
                    status
                    format
                    seasonYear
                    genres
                    nextAiringEpisode { episode airingAt timeUntilAiring }
                }
            }
            fantasyHighlights: Page(page: 1, perPage: 12) {
                media(genre: "Fantasy", sort: TRENDING_DESC, type: ANIME, isAdult: false) {
                    id
                    idMal
                    title { romaji english }
                    coverImage { extraLarge large }
                    bannerImage
                    averageScore
                    episodes
                    status
                    format
                    seasonYear
                    genres
                    nextAiringEpisode { episode airingAt timeUntilAiring }
                }
            }
        }';

        $data = $this->query($query, [], 900); // 15 mins cache for fresh trending data

        return [
            'spotlight' => $data['spotlight']['media'] ?? [],
            'trending' => $data['trending']['media'] ?? [],
            'topAiring' => $data['topAiring']['media'] ?? [],
            'popularAllTime' => $data['popularAllTime']['media'] ?? [],
            'actionHighlights' => $data['actionHighlights']['media'] ?? [],
            'fantasyHighlights' => $data['fantasyHighlights']['media'] ?? [],
        ];
    }

    /**
     * Get detailed information for a single anime
     */
    public function getAnimeDetails(int $id): ?array
    {
        $query = '
        query ($id: Int) {
            Media(id: $id, type: ANIME) {
                id
                idMal
                title { romaji english native }
                bannerImage
                coverImage { extraLarge large color }
                description(asHtml: false)
                averageScore
                meanScore
                popularity
                favourites
                episodes
                duration
                status
                season
                seasonYear
                startDate { year month day }
                endDate { year month day }
                format
                genres
                nextAiringEpisode { episode airingAt timeUntilAiring }
                studios(isMain: true) {
                    nodes { id name siteUrl }
                }
                trailer { id site thumbnail }
                characters(sort: ROLE, perPage: 8) {
                    edges {
                        role
                        node {
                            id
                            name { full native }
                            image { large medium }
                        }
                        voiceActors(language: JAPANESE, sort: RELEVANCE) {
                            id
                            name { full native }
                            image { large medium }
                            languageV2
                        }
                    }
                }
                recommendations(sort: RATING_DESC, perPage: 8) {
                    nodes {
                        mediaRecommendation {
                            id
                            idMal
                            title { romaji english }
                            coverImage { extraLarge large }
                            bannerImage
                            averageScore
                            episodes
                            status
                            format
                            genres
                            nextAiringEpisode { episode airingAt timeUntilAiring }
                        }
                    }
                }
            }
        }';

        $data = $this->query($query, ['id' => $id], 3600);
        return $data['Media'] ?? null;
    }

    /**
     * Search and filter anime catalog
     */
    public function search(array $filters = []): array
    {
        $query = '
        query ($page: Int, $perPage: Int, $search: String, $genre: String, $year: Int, $season: MediaSeason, $format: MediaFormat, $status: MediaStatus, $sort: [MediaSort]) {
            Page(page: $page, perPage: $perPage) {
                pageInfo {
                    total
                    perPage
                    currentPage
                    lastPage
                    hasNextPage
                }
                media(search: $search, genre: $genre, seasonYear: $year, season: $season, format: $format, status: $status, sort: $sort, type: ANIME, isAdult: false) {
                    id
                    idMal
                    title { romaji english native }
                    coverImage { extraLarge large }
                    bannerImage
                    averageScore
                    episodes
                    status
                    format
                    seasonYear
                    season
                    genres
                    nextAiringEpisode { episode airingAt timeUntilAiring }
                }
            }
        }';

        // Map friendly sort values to AniList GraphQL enum values
        $sortMap = [
            'trending' => ['TRENDING_DESC'],
            'popular' => ['POPULARITY_DESC'],
            'score' => ['SCORE_DESC'],
            'newest' => ['START_DATE_DESC'],
            'favorites' => ['FAVOURITES_DESC'],
        ];

        $rawSort = strtolower($filters['sort'] ?? 'trending');
        $resolvedSort = $sortMap[$rawSort] ?? ['TRENDING_DESC'];

        $variables = [
            'page' => (int) ($filters['page'] ?? 1),
            'perPage' => min((int) ($filters['per_page'] ?? 24), 50),
            'search' => !empty($filters['q']) ? trim($filters['q']) : null,
            'genre' => !empty($filters['genre']) ? trim($filters['genre']) : null,
            'year' => !empty($filters['year']) ? (int) $filters['year'] : null,
            'season' => !empty($filters['season']) ? strtoupper($filters['season']) : null,
            'format' => !empty($filters['format']) ? strtoupper($filters['format']) : null,
            'status' => !empty($filters['status']) ? strtoupper($filters['status']) : null,
            'sort' => $resolvedSort,
        ];

        // Clean out null variables
        $variables = array_filter($variables, fn($v) => !is_null($v));

        $data = $this->query($query, $variables, 900);

        return [
            'pageInfo' => $data['Page']['pageInfo'] ?? [
                'total' => 0,
                'perPage' => 24,
                'currentPage' => 1,
                'lastPage' => 1,
                'hasNextPage' => false,
            ],
            'items' => $data['Page']['media'] ?? [],
        ];
    }

    /**
     * Get genre list with rich metadata and counts
     */
    public function getGenres(): array
    {
        return [
            ['name' => 'Action', 'count' => '1,800+', 'icon' => 'sports_martial_arts'],
            ['name' => 'Adventure', 'count' => '1,400+', 'icon' => 'explore'],
            ['name' => 'Comedy', 'count' => '2,200+', 'icon' => 'sentiment_very_satisfied'],
            ['name' => 'Drama', 'count' => '1,600+', 'icon' => 'theater_comedy'],
            ['name' => 'Ecchi', 'count' => '600+', 'icon' => 'favorite'],
            ['name' => 'Fantasy', 'count' => '2,100+', 'icon' => 'auto_awesome'],
            ['name' => 'Horror', 'count' => '450+', 'icon' => 'dark_mode'],
            ['name' => 'Mahou Shoujo', 'count' => '300+', 'icon' => 'magic_button'],
            ['name' => 'Mecha', 'count' => '550+', 'icon' => 'precision_manufacturing'],
            ['name' => 'Music', 'count' => '500+', 'icon' => 'music_note'],
            ['name' => 'Mystery', 'count' => '900+', 'icon' => 'visibility'],
            ['name' => 'Psychological', 'count' => '750+', 'icon' => 'psychology'],
            ['name' => 'Romance', 'count' => '1,700+', 'icon' => 'volunteer_activism'],
            ['name' => 'Sci-Fi', 'count' => '1,300+', 'icon' => 'rocket_launch'],
            ['name' => 'Slice of Life', 'count' => '1,100+', 'icon' => 'coffee'],
            ['name' => 'Sports', 'count' => '650+', 'icon' => 'sports_soccer'],
            ['name' => 'Supernatural', 'count' => '1,500+', 'icon' => 'cruelty_free'],
            ['name' => 'Thriller', 'count' => '600+', 'icon' => 'warning'],
        ];
    }
}
