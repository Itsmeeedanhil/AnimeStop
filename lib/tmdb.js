import { getTmdbFromIds } from './tmdbMapping.js';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const DEFAULT_TMDB_KEY = '8265bd1679663a7ea12ac168da84d2e8';

export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export const ADULT_KEYWORDS = [
  198385, // hentai
  256466, // erotic
  378816, // animated porn
  155477, // softcore
  161919, // adult animation
  195669, // ecchi
  190370, // erotic movie
  234502, // sex
  287501, // pornography
  180547, // porn
  159677, // masturbation
  222243, // erotic scene
  180549, // nudity
  271960, // sexual content
  180550, // female nudity
  262369, // eromanga
  308157, // eroge
  334316, // uncensored
].join(',');

// Exclude infinite legacy morning/kids broadcast cartoons from seasonal anime shelves
export const EXCLUDED_KIDS_SHOWS = new Set([
  65733,  // Doraemon (2005)
  6576,   // Doraemon (1979)
  2150,   // Doraemon (1973)
  30983,  // Detective Conan (1996)
  331981, // 名探偵コナン (Case Closed)
  57775,  // Chibi Maruko-chan (1995)
  2164,   // Chibi Maruko-chan (1990)
  4445,   // Sazae-san
  6232,   // Soreike! Anpanman
  1053,   // Anpanman
  3351,   // Crayon Shin-chan
  194916, // Chiikawa
]);

export const ADULT_TERMS = [
  'hentai',
  'overflow',
  'souryo to majiwaru',
  'secret mission - undercover',
  'isekai harem monogatari',
  'boku no pico',
  'ero manga',
  'eromanga',
  'kuroinu',
  'resort boin',
  'mankitsu happening',
  'tsunpure',
  'futanari',
  'oppai',
  'creampie',
  'schoolgirl crush',
  'shoujo ramune',
  'otome dori',
  'porno',
  'softcore',
  'hardcore',
  'erotic',
  'sexual',
  'sexually',
  'adam-kun',
  "adam's sweet agony",
  'animefesta',
  'comicfesta',
  'sweet agony',
  'festa anime',
  'eroge',
];

export function isAdultAnime(item) {
  if (!item) return false;
  if (item.adult || item.softcore) return true;

  const title = (item.name || item.title || item.original_name || item.original_title || '').toLowerCase();
  const overview = (item.overview || '').toLowerCase();
  const genres = (item.genres || []).map((g) => (typeof g === 'string' ? g : g?.name || '').toLowerCase());

  if (genres.some((g) => g.includes('hentai') || g.includes('erotica') || g.includes('adult'))) {
    return true;
  }

  for (const term of ADULT_TERMS) {
    if (title.includes(term)) return true;
    if (overview.length > 0) {
      const regex = new RegExp(`\\b${term}\\b`, 'i');
      if (regex.test(overview) || overview.includes(term)) {
        return true;
      }
    }
  }

  return false;
}

export function getTmdbImage(path, size = 'original') {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export async function fetchTmdb(endpoint, params = {}, revalidate = 3600) {
  const apiKey = process.env.TMDB_API_KEY || DEFAULT_TMDB_KEY;
  const url = new URL(`${TMDB_API_BASE}${endpoint}`);
  url.searchParams.set('api_key', apiKey);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
      next: { revalidate },
    });

    if (!res.ok) {
      console.warn(`TMDB fetch error on ${endpoint}: ${res.status} ${res.statusText}`);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error(`TMDB network error on ${endpoint}:`, err.message);
    return null;
  }
}

// Helper to format a TMDB TV or Movie item into AnimeStop standard media card schema
export function formatTmdbAnime(item, formatOverride = null) {
  if (!item) return null;

  const isMovie = formatOverride ? formatOverride === 'MOVIE' : item.media_type === 'movie' || !item.name;
  const titleText = item.name || item.title || item.original_name || item.original_title || 'Untitled Anime';
  const originalTitle = item.original_name || item.original_title || titleText;
  const poster = getTmdbImage(item.poster_path, 'w500');
  const backdrop = getTmdbImage(item.backdrop_path, 'original');
  const releaseDate = item.first_air_date || item.release_date || '';
  const seasonYear = releaseDate ? parseInt(releaseDate.split('-')[0], 10) : null;
  const rating = item.vote_average ? Math.round(item.vote_average * 10) : 80;

  let normalizedStatus = null;
  if (isMovie) {
    normalizedStatus = 'FINISHED';
  } else if (item.status) {
    const s = item.status.toLowerCase();
    if (s.includes('returning') || s.includes('airing')) normalizedStatus = 'RELEASING';
    else if (s.includes('ended') || s.includes('finished')) normalizedStatus = 'FINISHED';
    else if (s.includes('plan') || s.includes('production') || s.includes('upcoming')) normalizedStatus = 'NOT_YET_RELEASED';
    else if (s.includes('cancel')) normalizedStatus = 'CANCELLED';
    else normalizedStatus = item.status.toUpperCase();
  }

  return {
    id: item.id,
    idMal: item.id,
    title: {
      english: titleText,
      romaji: originalTitle,
      native: originalTitle,
    },
    coverImage: {
      extraLarge: poster || backdrop || '/placeholder.png',
      large: poster || backdrop || '/placeholder.png',
      medium: poster || backdrop || '/placeholder.png',
    },
    bannerImage: backdrop || poster,
    description: item.overview || 'No synopsis available.',
    averageScore: rating,
    popularity: item.popularity || 1000,
    episodes: item.number_of_episodes || (isMovie ? 1 : null),
    seasonYear,
    status: normalizedStatus,
    format: isMovie ? 'MOVIE' : 'TV',
    genres: (item.genres || []).map((g) => g.name || g).filter((g) => g !== 'Animation'),
    trailer: null,
  };
}

export async function getHomeFeed() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const threeMonthsAgo = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const nextMonth = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const recentThreshold = `${currentYear - 2}-01-01`;

  const [trendingTv, seasonalAiringTv, topPopularTv, topRatedTv, popularMovies] = await Promise.all([
    // Trending: Modern anime with high activity in recent years
    fetchTmdb('/discover/tv', {
      with_genres: 16,
      with_original_language: 'ja',
      without_keywords: ADULT_KEYWORDS,
      'first_air_date.gte': recentThreshold,
      sort_by: 'popularity.desc',
      page: 1,
    }),
    // Top Airing: Current seasonal anime with episodes broadcast in current seasonal window
    fetchTmdb('/discover/tv', {
      with_genres: 16,
      with_original_language: 'ja',
      without_keywords: ADULT_KEYWORDS,
      'air_date.gte': threeMonthsAgo,
      'air_date.lte': nextMonth,
      sort_by: 'popularity.desc',
      page: 1,
    }),
    // All-time popular anime: highest global community engagement
    fetchTmdb('/discover/tv', {
      with_genres: 16,
      with_original_language: 'ja',
      without_keywords: ADULT_KEYWORDS,
      sort_by: 'vote_count.desc',
      page: 1,
    }),
    // Top rated anime: critically acclaimed masterpieces
    fetchTmdb('/discover/tv', {
      with_genres: 16,
      with_original_language: 'ja',
      without_keywords: ADULT_KEYWORDS,
      sort_by: 'vote_average.desc',
      'vote_count.gte': 150,
      page: 1,
    }),
    // Anime Movies: Top popular feature films
    fetchTmdb('/discover/movie', {
      with_genres: 16,
      with_original_language: 'ja',
      without_keywords: ADULT_KEYWORDS,
      sort_by: 'popularity.desc',
      page: 1,
    }),
  ]);

  const trendingList = (trendingTv?.results || [])
    .filter((item) => !isAdultAnime(item) && !EXCLUDED_KIDS_SHOWS.has(item.id))
    .map((item) => formatTmdbAnime(item, 'TV'));

  const airingList = (seasonalAiringTv?.results || [])
    .filter((item) => !isAdultAnime(item) && !EXCLUDED_KIDS_SHOWS.has(item.id))
    .map((item) => formatTmdbAnime(item, 'TV'));

  const popularList = (topPopularTv?.results || [])
    .filter((item) => !isAdultAnime(item) && !EXCLUDED_KIDS_SHOWS.has(item.id))
    .map((item) => formatTmdbAnime(item, 'TV'));

  const topRatedList = (topRatedTv?.results || [])
    .filter((item) => !isAdultAnime(item) && !EXCLUDED_KIDS_SHOWS.has(item.id))
    .map((item) => formatTmdbAnime(item, 'TV'));

  const moviesList = (popularMovies?.results || [])
    .filter((item) => !isAdultAnime(item))
    .map((item) => formatTmdbAnime(item, 'MOVIE'));

  // Spotlight features the top 6 trending anime with high quality backdrops
  const spotlightCandidates = [...airingList, ...trendingList].filter((item) => item.bannerImage && item.bannerImage !== '/placeholder.png');
  const spotlightMap = new Map();
  spotlightCandidates.forEach((item) => {
    if (!spotlightMap.has(item.id)) spotlightMap.set(item.id, item);
  });
  const spotlight = Array.from(spotlightMap.values()).slice(0, 6);

  return {
    spotlight: spotlight.length > 0 ? spotlight : trendingList.slice(0, 6),
    trending: trendingList.slice(0, 16),
    topAiring: (airingList.length > 0 ? airingList : trendingList).slice(0, 16),
    popular: popularList.slice(0, 16),
    topRated: topRatedList.slice(0, 16),
    latestEpisodes: (airingList.length > 0 ? airingList : trendingList).slice(0, 16),
    movies: moviesList.slice(0, 16),
  };
}

export async function getAnimeDetails(id, typeHint = null) {
  const numericId = parseInt(id, 10);
  if (!numericId) return null;

  let tmdbIdToFetch = numericId;
  let isMovie = typeHint === 'movie';

  // 1. Check if ID is mapped in anime-tmdb-map.json (for legacy AniList / MAL IDs)
  const mapped = getTmdbFromIds(numericId);
  if (mapped?.tmdbId) {
    tmdbIdToFetch = mapped.tmdbId;
    if (mapped.type === 'movie') isMovie = true;
  }

  // 2. Try TV show first unless typeHint is explicitly movie
  let data = null;
  if (!isMovie) {
    data = await fetchTmdb(`/tv/${tmdbIdToFetch}`, {
      append_to_response: 'credits,recommendations,similar,videos,images',
    });
  }

  // Fallback to movie if TV lookup returned 404 or empty
  if (!data) {
    data = await fetchTmdb(`/movie/${tmdbIdToFetch}`, {
      append_to_response: 'credits,recommendations,similar,videos,images',
    });
    if (data) isMovie = true;
  }

  // 3. If still not found or not animation/Japanese, fallback to AniList Title Lookup -> TMDB Search
  const isAnimation = data && (data.genres || []).some((g) => g.id === 16 || g.name === 'Animation');
  const isJapanese = data && (data.original_language === 'ja' || !data.original_language);

  if (!data || (!isAnimation && !isJapanese)) {
    try {
      const query = 'query ($id: Int) { Media(id: $id, type: ANIME) { id title { english romaji native } format } }';
      const alRes = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { id: numericId } }),
      });
      const alJson = await alRes.json();
      const alMedia = alJson?.data?.Media;
      if (alMedia?.title) {
        const searchTitle = alMedia.title.english || alMedia.title.romaji || alMedia.title.native;
        const searchResults = await searchAnime(searchTitle, 1, alMedia.format === 'MOVIE' ? 'movie' : 'all');
        if (searchResults?.results?.length > 0) {
          const matchedTmdb = searchResults.results[0];
          return getAnimeDetails(matchedTmdb.id, matchedTmdb.isMovie ? 'movie' : 'tv');
        }
      }
    } catch (e) {
      console.warn('AniList fallback search failed:', e);
    }
  }

  if (!data || isAdultAnime(data)) return null;

  const titleText = data.name || data.title || data.original_name || data.original_title;
  const originalTitle = data.original_name || data.original_title || titleText;
  const poster = getTmdbImage(data.poster_path, 'w500');
  const backdrop = getTmdbImage(data.backdrop_path, 'original');
  const releaseDate = data.first_air_date || data.release_date || '';
  const seasonYear = releaseDate ? parseInt(releaseDate.split('-')[0], 10) : null;
  const rating = data.vote_average ? Math.round(data.vote_average * 10) : 80;

  // Find official trailer from YouTube videos
  const videos = data.videos?.results || [];
  const officialTrailer =
    videos.find((v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser') && v.official) ||
    videos.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ||
    videos.find((v) => v.site === 'YouTube');

  // Format cast and characters
  const castList = (data.credits?.cast || []).slice(0, 12).map((actor) => ({
    node: {
      name: { full: actor.character || actor.name },
      image: {
        large: getTmdbImage(actor.profile_path, 'w185') || poster,
        medium: getTmdbImage(actor.profile_path, 'w185') || poster,
      },
      actorName: actor.name,
    },
  }));

  // Format seasons list (excluding Season 0 / Specials unless only season)
  const rawSeasons = data.seasons || [];
  const filteredSeasons = rawSeasons.filter((s) => s.season_number > 0);
  const seasonsList = (filteredSeasons.length > 0 ? filteredSeasons : rawSeasons).map((s) => ({
    seasonNumber: s.season_number,
    name: s.name || `Season ${s.season_number}`,
    episodeCount: s.episode_count || 12,
    poster: getTmdbImage(s.poster_path, 'w500') || poster,
    airDate: s.air_date,
    overview: s.overview,
  }));

  // Recommendations filtered strictly to anime and non-adult
  const recResults = data.recommendations?.results || data.similar?.results || [];
  const recommendations = {
    edges: recResults
      .filter((rec) => ((rec.genre_ids || []).includes(16) || rec.original_language === 'ja') && !isAdultAnime(rec))
      .slice(0, 12)
      .map((rec) => ({
        node: {
          mediaRecommendation: formatTmdbAnime(rec, isMovie ? 'MOVIE' : 'TV'),
        },
      })),
  };

  return {
    id: data.id,
    idMal: data.id,
    tmdbId: data.id,
    originalQueryId: numericId,
    isMovie,
    title: {
      english: titleText,
      romaji: originalTitle,
      native: originalTitle,
    },
    coverImage: {
      extraLarge: poster || backdrop || '/placeholder.png',
      large: poster || backdrop || '/placeholder.png',
      medium: poster || backdrop || '/placeholder.png',
    },
    bannerImage: backdrop || poster,
    description: data.overview || 'No synopsis available.',
    averageScore: rating,
    popularity: data.popularity || 1000,
    episodes: data.number_of_episodes || (isMovie ? 1 : seasonsList[0]?.episodeCount || 12),
    numberOfSeasons: data.number_of_seasons || (isMovie ? 1 : seasonsList.length || 1),
    duration: data.episode_run_time?.[0] || data.runtime || 24,
    seasonYear,
    status: data.status ? data.status.toUpperCase() : isMovie ? 'FINISHED' : 'RELEASING',
    format: isMovie ? 'MOVIE' : 'TV',
    genres: (data.genres || []).map((g) => g.name).filter((g) => g !== 'Animation'),
    studios: {
      nodes: (data.production_companies || []).map((c) => ({ name: c.name })),
    },
    characters: {
      edges: castList,
    },
    recommendations,
    seasons: seasonsList,
    trailer: officialTrailer
      ? {
          id: officialTrailer.key,
          site: 'youtube',
          thumbnail: `https://img.youtube.com/vi/${officialTrailer.key}/hqdefault.jpg`,
        }
      : null,
  };
}

export async function getSeasonEpisodes(tvId, seasonNumber = 1) {
  const numericId = parseInt(tvId, 10);
  const sNum = parseInt(seasonNumber, 10) || 1;

  const mapped = getTmdbFromIds(numericId);
  const targetTmdbId = mapped?.tmdbId || numericId;

  const data = await fetchTmdb(`/tv/${targetTmdbId}/season/${sNum}`);
  if (!data || !data.episodes) return [];

  return data.episodes.map((ep) => ({
    number: ep.episode_number,
    seasonNumber: sNum,
    title: ep.name || `Episode ${ep.episode_number}`,
    duration: ep.runtime ? `${ep.runtime}m` : '24m',
    thumbnail: getTmdbImage(ep.still_path, 'w780'),
    synopsis: ep.overview || `Episode ${ep.episode_number} of Season ${sNum}.`,
    airDate: ep.air_date,
    isReleased: ep.air_date ? new Date(ep.air_date) <= new Date() : true,
  }));
}

export const GENRE_MAP = {
  action: '10759',
  'action & adventure': '10759',
  adventure: '10759',
  comedy: '35',
  drama: '18',
  'sci-fi': '10765',
  'science fiction': '10765',
  'sci-fi & fantasy': '10765',
  fantasy: '10765',
  mystery: '9648',
  supernatural: '10765',
  horror: '27',
  romance: '10749',
  thriller: '53',
  war: '10768',
  'war & politics': '10768',
  'slice of life': '35',
  sports: '18',
  psychological: '9648',
  shounen: '10759',
  shonen: '10759',
  seinen: '18',
  mecha: '10765',
  isekai: '10765',
};

export async function searchAnime(
  query = '',
  page = 1,
  type = 'all',
  genre = null,
  sort = 'popularity.desc',
  status = null
) {
  const pageNum = parseInt(page, 10) || 1;
  const isMovieOnly = type === 'movie';
  const isTvOnly = type === 'tv';
  const targetCount = 24; // Always return 24 complete cards for clean rows on 6, 4, 3, 2 col grids

  const tmdbPage1 = (pageNum - 1) * 2 + 1;
  const tmdbPage2 = (pageNum - 1) * 2 + 2;

  if (query && query.trim()) {
    // Keyword search across 2 pages in parallel
    const cleanQuery = query.trim();
    const endpoint = isMovieOnly ? '/search/movie' : isTvOnly ? '/search/tv' : '/search/multi';

    const [d1, d2] = await Promise.all([
      fetchTmdb(endpoint, { query: cleanQuery, page: tmdbPage1, include_adult: false }),
      fetchTmdb(endpoint, { query: cleanQuery, page: tmdbPage2, include_adult: false }),
    ]);

    const combined = [...(d1?.results || []), ...(d2?.results || [])];

    // Filter results strictly to Japanese Animation and Non-Adult
    const filtered = combined
      .filter((item) => {
        const isAnimation = (item.genre_ids || []).includes(16);
        const isJapanese = item.original_language === 'ja' || !item.original_language;
        return isAnimation && isJapanese && !isAdultAnime(item);
      })
      .map((item) => formatTmdbAnime(item));

    const sliced = filtered.slice(0, targetCount);
    const totalResults = d1?.total_results || sliced.length;
    const totalPages = Math.min(500, Math.max(1, Math.ceil(totalResults / targetCount)));

    return {
      page: pageNum,
      totalPages,
      totalResults,
      results: sliced,
    };
  }

  // Resolve genre ID
  let resolvedGenreId = null;
  if (genre && genre !== 'All') {
    const cleanGenreKey = String(genre).trim().toLowerCase();
    resolvedGenreId = GENRE_MAP[cleanGenreKey] || (Number.isInteger(Number(genre)) ? genre : null);
  }

  // Resolve sort field
  let resolvedSort = 'popularity.desc';
  if (sort === 'popular') resolvedSort = 'vote_count.desc';
  else if (sort === 'score') resolvedSort = 'vote_average.desc';
  else if (sort === 'newest') resolvedSort = isMovieOnly ? 'primary_release_date.desc' : 'first_air_date.desc';
  else if (sort && sort !== 'trending') resolvedSort = sort;

  // Catalog / Discover search
  const endpoint = isMovieOnly ? '/discover/movie' : '/discover/tv';
  const baseParams = {
    with_genres: resolvedGenreId ? `16,${resolvedGenreId}` : 16,
    with_original_language: 'ja',
    without_keywords: ADULT_KEYWORDS,
    sort_by: resolvedSort,
  };

  if (sort === 'score') {
    baseParams['vote_count.gte'] = 50;
  }

  if (status === 'ongoing') {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const nextMonth = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    baseParams['air_date.gte'] = threeMonthsAgo;
    baseParams['air_date.lte'] = nextMonth;
  } else if (status === 'released') {
    baseParams['with_status'] = '3';
  }

  const [d1, d2] = await Promise.all([
    fetchTmdb(endpoint, { ...baseParams, page: tmdbPage1 }),
    fetchTmdb(endpoint, { ...baseParams, page: tmdbPage2 }),
  ]);

  if (!d1 && !d2) return { page: pageNum, totalPages: 1, totalResults: 0, results: [] };

  const combined = [...(d1?.results || []), ...(d2?.results || [])];
  const results = combined
    .filter((item) => !isAdultAnime(item) && !EXCLUDED_KIDS_SHOWS.has(item.id))
    .slice(0, targetCount)
    .map((item) => formatTmdbAnime(item, isMovieOnly ? 'MOVIE' : 'TV'));

  const totalResults = d1?.total_results || results.length;
  const totalPages = Math.min(500, Math.max(1, Math.ceil(totalResults / targetCount)));

  return {
    page: pageNum,
    totalPages,
    totalResults,
    results,
  };
}

export const ANIME_GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Horror',
  'Mystery',
  'Psychological',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
  'Thriller',
];
