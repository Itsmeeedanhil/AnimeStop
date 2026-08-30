<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AnimeService
{
    protected string $graphqlUrl = 'https://graphql.anilist.co';

    /**
     * Execute a GraphQL query against AniList API with caching
     */
    public function query(string $query, array $variables = [], int $ttl = 3600): array
    {
        $cacheKey = 'anilist_' . md5($query . serialize($variables));

        return Cache::remember($cacheKey, $ttl, function () use ($query, $variables) {
            try {
                $response = Http::timeout(10)
                    ->withHeaders([
                        'Content-Type' => 'application/json',
                        'Accept' => 'application/json',
                    ])
                    ->post($this->graphqlUrl, [
                        'query' => $query,
                        'variables' => $variables,
                    ]);

                if ($response->successful()) {
                    return $response->json()['data'] ?? [];
                }

                Log::warning('AniList API non-200 response: ' . $response->status(), [
                    'body' => $response->body(),
                ]);
            } catch (\Throwable $e) {
                Log::error('AniList API Exception: ' . $e->getMessage());
            }

            return [];
        });
    }

    /**
     * Get home page dataset: Spotlight/Hero, Trending This Month, Top Airing, Popular, and Genres
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
                            format
                            genres
                        }
                    }
                }
                relations {
                    edges {
                        relationType
                        node {
                            id
                            idMal
                            title { romaji english }
                            coverImage { medium large }
                            format
                            status
                            averageScore
                        }
                    }
                }
            }
        }';

        $data = $this->query($query, ['id' => $id], 3600);

        return $data['Media'] ?? null;
    }

    /**
     * Search anime with filters
     */
    public function search(array $filters = []): array
    {
        $query = '
        query ($search: String, $page: Int, $perPage: Int, $genre: String, $sort: [MediaSort], $season: MediaSeason, $seasonYear: Int, $format: MediaFormat) {
            Page(page: $page, perPage: $perPage) {
                pageInfo {
                    total
                    currentPage
                    lastPage
                    hasNextPage
                    perPage
                }
                media(search: $search, genre: $genre, sort: $sort, season: $season, seasonYear: $seasonYear, format: $format, type: ANIME, isAdult: false) {
                    id
                    idMal
                    title { romaji english }
                    coverImage { extraLarge large }
                    bannerImage
                    description(asHtml: false)
                    averageScore
                    episodes
                    status
                    format
                    seasonYear
                    genres
                }
            }
        }';

        $variables = [
            'search' => !empty($filters['q']) ? (string) $filters['q'] : null,
            'page' => (int) ($filters['page'] ?? 1),
            'perPage' => min((int) ($filters['per_page'] ?? 24), 50),
            'genre' => !empty($filters['genre']) ? (string) $filters['genre'] : null,
            'format' => !empty($filters['format']) ? (string) $filters['format'] : null,
            'season' => !empty($filters['season']) ? (string) $filters['season'] : null,
            'seasonYear' => !empty($filters['year']) ? (int) $filters['year'] : null,
            'sort' => match ($filters['sort'] ?? 'trending') {
                'popular' => ['POPULARITY_DESC'],
                'score' => ['SCORE_DESC'],
                'newest' => ['START_DATE_DESC'],
                'favorites' => ['FAVOURITES_DESC'],
                default => ['TRENDING_DESC'],
            },
        ];

        // Remove null variables
        $variables = array_filter($variables, fn ($v) => !is_null($v));

        $data = $this->query($query, $variables, 1800);

        return [
            'items' => $data['Page']['media'] ?? [],
            'pagination' => $data['Page']['pageInfo'] ?? [
                'total' => 0,
                'currentPage' => 1,
                'lastPage' => 1,
                'hasNextPage' => false,
            ],
        ];
    }

    /**
     * Get genres list with metadata
     */
    public function getGenres(): array
    {
        return [
            ['name' => 'Action', 'icon' => 'swords', 'count' => '3.5k+'],
            ['name' => 'Adventure', 'icon' => 'explore', 'count' => '2.8k+'],
            ['name' => 'Comedy', 'icon' => 'sentiment_very_satisfied', 'count' => '4.1k+'],
            ['name' => 'Drama', 'icon' => 'theater_comedy', 'count' => '3.2k+'],
            ['name' => 'Fantasy', 'icon' => 'auto_fix_high', 'count' => '3.9k+'],
            ['name' => 'Horror', 'icon' => 'skull', 'count' => '1.1k+'],
            ['name' => 'Mecha', 'icon' => 'smart_toy', 'count' => '900+'],
            ['name' => 'Mystery', 'icon' => 'visibility', 'count' => '1.7k+'],
            ['name' => 'Psychological', 'icon' => 'psychology', 'count' => '1.4k+'],
            ['name' => 'Romance', 'icon' => 'favorite', 'count' => '2.9k+'],
            ['name' => 'Sci-Fi', 'icon' => 'rocket_launch', 'count' => '2.6k+'],
            ['name' => 'Slice of Life', 'icon' => 'coffee', 'count' => '2.2k+'],
            ['name' => 'Sports', 'icon' => 'sports_soccer', 'count' => '850+'],
            ['name' => 'Supernatural', 'icon' => 'flare', 'count' => '2.4k+'],
            ['name' => 'Thriller', 'icon' => 'warning', 'count' => '1.3k+'],
        ];
    }
}
