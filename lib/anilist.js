import homeFeedSnapshot from './mock/homeFeed.js';

const ANILIST_API = 'https://graphql.anilist.co';

export async function fetchAniList(query, variables = {}, revalidate = 3600) {
  try {
    const res = await fetch(ANILIST_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
      next: { revalidate },
    });

    if (!res.ok) {
      console.warn(`AniList API status ${res.status} (${res.statusText}). Using local offline snapshot.`);
      return null;
    }

    const data = await res.json();
    if (data.errors && !data.data) {
      console.warn('AniList API errors. Using local offline snapshot.');
      return null;
    }
    return data.data;
  } catch (err) {
    console.warn('AniList fetch network error. Using local offline snapshot:', err.message);
    return null;
  }
}

export async function getHomeFeed() {
  const query = `
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
      popular: Page(page: 1, perPage: 16) {
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
      seasonal: Page(page: 1, perPage: 16) {
        media(season: WINTER, seasonYear: 2026, sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
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
    }
  `;

  try {
    const data = await fetchAniList(query, {}, 1800);
    if (data && data.spotlight?.media?.length > 0) {
      return {
        spotlight: data.spotlight?.media || [],
        trending: data.trending?.media || [],
        topAiring: data.topAiring?.media || [],
        popular: data.popular?.media || [],
        seasonal: data.seasonal?.media || [],
      };
    }
  } catch (e) {
    console.warn('AniList home feed unavailable, using local snapshot.');
  }

  return homeFeedSnapshot;
}

export async function getAnimeDetails(id) {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        idMal
        title { romaji english native }
        coverImage { extraLarge large color }
        bannerImage
        startDate { year month day }
        endDate { year month day }
        description(asHtml: false)
        season
        seasonYear
        type
        format
        status
        episodes
        duration
        chapters
        volumes
        genres
        synonyms
        averageScore
        meanScore
        popularity
        trending
        favourites
        tags { id name description rank isMediaSpoiler isGeneralSpoiler }
        relations {
          edges {
            relationType(version: 2)
            node {
              id
              title { romaji english }
              format
              type
              status
              coverImage { large }
            }
          }
        }
        characters(sort: ROLE, perPage: 12) {
          edges {
            role
            node {
              id
              name { full native }
              image { large }
            }
            voiceActors(language: JAPANESE) {
              id
              name { full }
              image { large }
              languageV2
            }
          }
        }
        studios(isMain: true) {
          nodes { id name siteUrl }
        }
        nextAiringEpisode { airingAt timeUntilAiring episode }
        trailer { id site thumbnail }
        streamingEpisodes {
          title
          thumbnail
          url
          site
        }
        rankings { id rank type format year season allTime context }
        recommendations(sort: RATING_DESC, perPage: 8) {
          nodes {
            mediaRecommendation {
              id
              title { romaji english }
              coverImage { large }
              averageScore
              format
            }
          }
        }
      }
    }
  `;

  try {
    const data = await fetchAniList(query, { id: parseInt(id, 10) }, 3600);
    if (data?.Media?.id) return data.Media;
  } catch (e) {}

  // Fallback: Check local snapshot
  const numericId = parseInt(id, 10);
  const allSnapshot = [
    ...(homeFeedSnapshot.spotlight || []),
    ...(homeFeedSnapshot.trending || []),
    ...(homeFeedSnapshot.topAiring || []),
    ...(homeFeedSnapshot.popular || []),
    ...(homeFeedSnapshot.seasonal || []),
  ];
  const matched = allSnapshot.find(a => a.id === numericId || a.idMal === numericId);
  if (matched) {
    return {
      ...matched,
      characters: { edges: [] },
      relations: { edges: [] },
      recommendations: { nodes: [] },
    };
  }

  return null;
}

export async function searchAnime({
  q = '',
  genre = '',
  format = '',
  season = '',
  year = null,
  sort = 'trending',
  page = 1,
  per_page = 20,
}) {
  const sortMap = {
    trending: 'TRENDING_DESC',
    popular: 'POPULARITY_DESC',
    score: 'SCORE_DESC',
    newest: 'START_DATE_DESC',
    favorites: 'FAVOURITES_DESC',
  };

  const variables = {
    page: parseInt(page, 10) || 1,
    perPage: Math.min(parseInt(per_page, 10) || 20, 50),
    sort: sortMap[sort] || 'TRENDING_DESC',
    type: 'ANIME',
  };

  if (q && q.trim()) variables.search = q.trim();
  if (genre && genre !== 'All' && genre !== '') variables.genre = genre;
  if (format && format !== 'All' && format !== '') variables.format = format;
  if (season && season !== 'All' && season !== '') variables.season = season;
  if (year) variables.seasonYear = parseInt(year, 10);

  const query = `
    query ($page: Int, $perPage: Int, $search: String, $genre: String, $format: MediaFormat, $season: MediaSeason, $seasonYear: Int, $sort: [MediaSort]) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          total
          perPage
          currentPage
          lastPage
          hasNextPage
        }
        media(search: $search, genre: $genre, format: $format, season: $season, seasonYear: $seasonYear, sort: $sort, type: ANIME, isAdult: false) {
          id
          idMal
          title { romaji english }
          coverImage { extraLarge large color }
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
    }
  `;

  try {
    const data = await fetchAniList(query, variables, 600);
    if (data?.Page?.media && data.Page.media.length > 0) {
      return {
        results: data.Page.media,
        pageInfo: data.Page.pageInfo || { total: data.Page.media.length, currentPage: 1, hasNextPage: false },
      };
    }
  } catch (e) {}

  // Fallback: Filter local snapshot
  const allSnapshot = [
    ...(homeFeedSnapshot.spotlight || []),
    ...(homeFeedSnapshot.trending || []),
    ...(homeFeedSnapshot.topAiring || []),
    ...(homeFeedSnapshot.popular || []),
    ...(homeFeedSnapshot.seasonal || []),
  ];

  let filtered = allSnapshot;
  if (q && q.trim()) {
    const lower = q.toLowerCase().trim();
    filtered = filtered.filter(a =>
      a.title?.english?.toLowerCase().includes(lower) ||
      a.title?.romaji?.toLowerCase().includes(lower)
    );
  }
  if (genre && genre !== 'All') {
    filtered = filtered.filter(a => a.genres?.includes(genre));
  }

  return {
    results: filtered,
    pageInfo: { total: filtered.length, currentPage: 1, hasNextPage: false },
  };
}

export function getGenres() {
  return [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy', 'Horror',
    'Mahou Shoujo', 'Mecha', 'Music', 'Mystery', 'Psychological', 'Romance',
    'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'
  ];
}

