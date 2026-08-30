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
     * Get home page dataset with nextAiringEpisode schedules
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
                    nextAiringEpisode {
                        airingAt
                        timeUntilAiring
                        episode
                    }
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
                    nextAiringEpisode {
                        airingAt
                        timeUntilAiring
                        episode
                    }
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
                    nextAiringEpisode {
                        airingAt
                        timeUntilAiring
                        episode
                    }
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
                    nextAiringEpisode {
                        airingAt
                        timeUntilAiring
                        episode
                    }
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

        $data = $this->query($query, [], 900);

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
     * Get detailed information for a single anime including nextAiringEpisode
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
                nextAiringEpisode {
                    airingAt
                    timeUntilAiring
                    episode
                }
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
                            nextAiringEpisode {
                                airingAt
                                timeUntilAiring
                                episode
                            }
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
     * Search anime with filters including nextAiringEpisode
     */
    public function search(array $filters = []): array
    {
        $query = '
        query ($page: Int, $perPage: Int, $search: String, $genre: String, $status: MediaStatus, $format: MediaFormat, $sort: [MediaSort]) {
            Page(page: $page, perPage: $perPage) {
                pageInfo {
                    total
                    perPage
                    currentPage
                    lastPage
                    hasNextPage
                }
                media(search: $search, genre: $genre, status: $status, format: $format, sort: $sort, type: ANIME, isAdult: false) {
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
                    nextAiringEpisode {
                        airingAt
                        timeUntilAiring
                        episode
                    }
                }
            }
        }';

        $variables = [
            'page' => (int) ($filters['page'] ?? 1),
            'perPage' => min((int) ($filters['per_page'] ?? 24), 50),
            'search' => ! empty($filters['q']) ? $filters['q'] : null,
            'genre' => ! empty($filters['genre']) ? $filters['genre'] : null,
            'status' => ! empty($filters['status']) ? $filters['status'] : null,
            'format' => ! empty($filters['format']) ? $filters['format'] : null,
            'sort' => ! empty($filters['sort']) ? [$filters['sort']] : ['TRENDING_DESC'],
        ];

        $variables = array_filter($variables, fn ($val) => ! is_null($val));

        $data = $this->query($query, $variables, 1800);

        return [
            'items' => $data['Page']['media'] ?? [],
            'pageInfo' => $data['Page']['pageInfo'] ?? [
                'total' => 0,
                'perPage' => $variables['perPage'],
                'currentPage' => $variables['page'],
                'lastPage' => 1,
                'hasNextPage' => false,
            ],
        ];
    }

    /**
     * Get list of genres
     */
    public function getGenres(): array
    {
        $query = 'query { GenreCollection }';
        $data = $this->query($query, [], 86400 * 7);

        return $data['GenreCollection'] ?? [
            'Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy',
            'Horror', 'Mahou Shoujo', 'Mecha', 'Music', 'Mystery', 'Psychological',
            'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller',
        ];
    }
}
