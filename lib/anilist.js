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

  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) return null;

  // 1. Fallback: Check local snapshot
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

  // 2. Fallback: Live Jikan (MyAnimeList) Lookup
  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${numericId}/full`, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const json = await res.json();
      const d = json.data;
      if (d) {
        const poster = d.images?.webp?.large_image_url || d.images?.jpg?.large_image_url || d.images?.jpg?.image_url;
        const banner = d.trailer?.images?.maximum_image_url || d.trailer?.images?.large_image_url || poster;
        return {
          id: d.mal_id,
          idMal: d.mal_id,
          title: {
            romaji: d.title || d.title_english || 'Anime',
            english: d.title_english || d.title || d.title_japanese || 'Anime',
            native: d.title_japanese || d.title || 'Anime',
          },
          coverImage: { extraLarge: poster, large: poster, color: '#ffe9b0' },
          bannerImage: banner,
          description: (d.synopsis || '').replace(/\[Written by MAL Rewrite\]/g, '').trim(),
          averageScore: d.score ? Math.round(d.score * 10) : 85,
          popularity: d.members || 100000,
          episodes: d.episodes || 12,
          seasonYear: d.year || (d.aired?.from ? parseInt(d.aired.from.slice(0, 4), 10) : 2024),
          season: (d.season || 'WINTER').toUpperCase(),
          status: d.status === 'Currently Airing' ? 'RELEASING' : 'FINISHED',
          format: (d.type || 'TV').toUpperCase(),
          genres: (d.genres || []).map(g => g.name),
          nextAiringEpisode: null,
          trailer: d.trailer?.youtube_id ? {
            id: d.trailer.youtube_id,
            site: 'youtube',
            thumbnail: d.trailer.images?.maximum_image_url || d.trailer.images?.large_image_url || `https://i.ytimg.com/vi/${d.trailer.youtube_id}/hqdefault.jpg`,
          } : null,
          characters: { edges: [] },
          relations: { edges: [] },
          recommendations: { nodes: [] },
        };
      }
    }
  } catch (e) {}

  // 3. Fallback: Live Kitsu Lookup with external ID mappings
  try {
    const res = await fetch(`https://kitsu.io/api/edge/anime/${numericId}?include=mappings`, {
      headers: { 'Accept': 'application/vnd.api+json', 'User-Agent': 'AnimeStop/2.0' },
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const json = await res.json();
      const attr = json.data?.attributes;
      if (attr) {
        let aniId = null;
        let malId = null;

        if (Array.isArray(json.included)) {
          for (const inc of json.included) {
            if (inc.type === 'mappings') {
              if (inc.attributes?.externalSite === 'anilist/anime') {
                aniId = parseInt(inc.attributes.externalId, 10);
              }
              if (inc.attributes?.externalSite === 'myanimelist/anime') {
                malId = parseInt(inc.attributes.externalId, 10);
              }
            }
          }
        }

        const romaji = attr.titles?.en_jp || attr.titles?.ja_jp || attr.canonicalTitle || 'Anime';
        const english = attr.titles?.en || attr.titles?.en_us || attr.canonicalTitle || romaji;
        const poster = attr.posterImage?.large || attr.posterImage?.original || attr.posterImage?.medium;
        const banner = attr.coverImage?.large || attr.coverImage?.original || poster;
        return {
          id: aniId || numericId,
          idMal: malId || aniId || numericId,
          title: { romaji, english, native: attr.titles?.ja_jp || romaji },
          coverImage: { extraLarge: poster, large: poster, color: '#ffe9b0' },
          bannerImage: banner,
          description: (attr.synopsis || attr.description || '').replace(/\[Written by MAL Rewrite\]/g, '').trim(),
          averageScore: Math.round(parseFloat(attr.averageRating || '80')),
          popularity: attr.userCount || 10000,
          episodes: attr.episodeCount || 12,
          seasonYear: attr.startDate ? parseInt(attr.startDate.slice(0, 4), 10) : 2024,
          season: 'WINTER',
          status: attr.status === 'current' ? 'RELEASING' : (attr.status === 'upcoming' ? 'NOT_YET_RELEASED' : 'FINISHED'),
          format: (attr.subtype || 'TV').toUpperCase(),
          genres: ['Action', 'Adventure', 'Fantasy', 'Animation'],
          nextAiringEpisode: null,
          trailer: attr.youtubeVideoId ? { id: attr.youtubeVideoId, site: 'youtube', thumbnail: `https://i.ytimg.com/vi/${attr.youtubeVideoId}/hqdefault.jpg` } : null,
          characters: { edges: [] },
          relations: { edges: [] },
          recommendations: { nodes: [] },
        };
      }
    }
  } catch (e) {}

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

  // 1. Fallback: Live Kitsu Text Search or Catalog Browse with ID mappings
  try {
    let kitsuUrl = `https://kitsu.io/api/edge/anime?include=mappings&page[limit]=20&page[offset]=${(parseInt(page, 10) - 1) * 20}`;
    if (q && q.trim()) {
      kitsuUrl += `&filter[text]=${encodeURIComponent(q.trim())}`;
    } else if (sort === 'score') {
      kitsuUrl += '&sort=-averageRating';
    } else {
      kitsuUrl += '&sort=-userCount';
    }
    if (genre && genre !== 'All' && genre !== '') {
      kitsuUrl += `&filter[categories]=${encodeURIComponent(genre.toLowerCase())}`;
    }

    const res = await fetch(kitsuUrl, {
      headers: { 'Accept': 'application/vnd.api+json', 'User-Agent': 'AnimeStop/2.0' },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data) && json.data.length > 0) {
        const mappingsMap = new Map();
        if (Array.isArray(json.included)) {
          for (const inc of json.included) {
            if (inc.type === 'mappings') {
              mappingsMap.set(inc.id, inc.attributes);
            }
          }
        }

        const mapped = json.data.map(item => {
          const attr = item.attributes;
          if (!attr) return null;

          const rels = item.relationships?.mappings?.data || [];
          let aniId = null;
          let malId = null;
          for (const r of rels) {
            const m = mappingsMap.get(r.id);
            if (m) {
              if (m.externalSite === 'anilist/anime') aniId = parseInt(m.externalId, 10);
              if (m.externalSite === 'myanimelist/anime') malId = parseInt(m.externalId, 10);
            }
          }

          const romaji = attr.titles?.en_jp || attr.titles?.ja_jp || attr.canonicalTitle || 'Anime';
          const english = attr.titles?.en || attr.titles?.en_us || attr.canonicalTitle || romaji;
          const poster = attr.posterImage?.large || attr.posterImage?.medium || attr.posterImage?.original;
          return {
            id: aniId || parseInt(item.id, 10),
            idMal: malId || aniId || parseInt(item.id, 10),
            title: { romaji, english },
            coverImage: { extraLarge: poster, large: poster, color: '#ffe9b0' },
            bannerImage: attr.coverImage?.large || poster,
            averageScore: Math.round(parseFloat(attr.averageRating || '80')),
            episodes: attr.episodeCount || 12,
            status: attr.status === 'current' ? 'RELEASING' : (attr.status === 'upcoming' ? 'NOT_YET_RELEASED' : 'FINISHED'),
            format: (attr.subtype || 'TV').toUpperCase(),
            seasonYear: attr.startDate ? parseInt(attr.startDate.slice(0, 4), 10) : 2024,
            genres: ['Action', 'Adventure', 'Fantasy'],
            nextAiringEpisode: null,
          };
        }).filter(Boolean);

        if (mapped.length > 0) {
          return {
            results: mapped,
            pageInfo: { total: mapped.length * 10, currentPage: parseInt(page, 10) || 1, hasNextPage: true },
          };
        }
      }
    }
  } catch (e) {}

  // 2. Fallback: Filter local snapshot
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

