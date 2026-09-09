const SHIKIMORI_GRAPHQL = 'https://shikimori.one/api/graphql';

export function cleanBBCode(text) {
  if (!text) return '';
  return text
    .replace(/\[character=\d+\](.*?)\[\/character\]/gi, '$1')
    .replace(/\[anime=\d+\](.*?)\[\/anime\]/gi, '$1')
    .replace(/\[manga=\d+\](.*?)\[\/manga\]/gi, '$1')
    .replace(/\[person=\d+\](.*?)\[\/person\]/gi, '$1')
    .replace(/\[url=.*?\](.*?)\[\/url\]/gi, '$1')
    .replace(/\[\/?(b|i|u|s|quote|spoiler)\]/gi, '')
    .replace(/\[Written by MAL Rewrite\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function hasCyrillic(text) {
  return /[а-яА-ЯёЁ]/.test(text || '');
}

export async function fetchEnglishSynopsis(malId, searchTitle = '') {
  // 1. Kitsu mapping by MAL ID
  if (malId) {
    try {
      const url = `https://kitsu.io/api/edge/mappings?filter[external_site]=myanimelist/anime&filter[external_id]=${malId}&include=item`;
      const res = await fetch(url, {
        headers: { 'Accept': 'application/vnd.api+json' },
        next: { revalidate: 86400 },
      });
      if (res.ok) {
        const json = await res.json();
        const item = json.included?.[0];
        const desc = item?.attributes?.description;
        const kitsuTitle = item?.attributes?.titles?.en || item?.attributes?.canonicalTitle;
        if (desc && !hasCyrillic(desc)) {
          return {
            synopsis: cleanBBCode(desc),
            englishTitle: kitsuTitle,
          };
        }
      }
    } catch (e) {}
  }

  // 2. Kitsu search by title
  if (searchTitle) {
    try {
      const url = `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(searchTitle)}&page[limit]=1`;
      const res = await fetch(url, {
        headers: { 'Accept': 'application/vnd.api+json' },
        next: { revalidate: 86400 },
      });
      if (res.ok) {
        const json = await res.json();
        const item = json.data?.[0];
        const desc = item?.attributes?.description;
        const kitsuTitle = item?.attributes?.titles?.en || item?.attributes?.canonicalTitle;
        if (desc && !hasCyrillic(desc)) {
          return {
            synopsis: cleanBBCode(desc),
            englishTitle: kitsuTitle,
          };
        }
      }
    } catch (e) {}
  }

  // 3. Jikan API
  if (malId) {
    try {
      const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}`, {
        next: { revalidate: 86400 },
      });
      if (res.ok) {
        const json = await res.json();
        const desc = json.data?.synopsis;
        const jikanTitle = json.data?.title_english || json.data?.title;
        if (desc && !hasCyrillic(desc)) {
          return {
            synopsis: cleanBBCode(desc),
            englishTitle: jikanTitle,
          };
        }
      }
    } catch (e) {}
  }

  return null;
}

function mapShikimoriAnime(item) {
  if (!item) return null;
  const id = parseInt(item.malId || item.id, 10);
  const romaji = item.name || 'Anime';
  let english = item.english || item.name || 'Anime';
  if (hasCyrillic(english)) {
    english = romaji;
  }
  const native = item.japanese || romaji;

  const poster = item.poster?.originalUrl || item.poster?.mainUrl || '';
  const banner = item.screenshots?.[0]?.originalUrl || poster;

  let trailer = null;
  if (Array.isArray(item.videos) && item.videos.length > 0) {
    const ytVideo = item.videos.find((v) => v.hosting === 'youtube' || (v.url && v.url.includes('youtube.com')));
    if (ytVideo) {
      let ytId = ytVideo.id;
      if (ytVideo.url) {
        const match = ytVideo.url.match(/(?:v=|\/embed\/|\/watch\?v=|\/v\/|youtu\.be\/|\/e\/)([^#&?]*).*/);
        if (match && match[1]) ytId = match[1];
      }
      if (ytId) {
        trailer = {
          id: ytId,
          site: 'youtube',
          thumbnail: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
        };
      }
    }
  }

  let status = 'FINISHED';
  if (item.status === 'ongoing') status = 'RELEASING';
  else if (item.status === 'anons') status = 'NOT_YET_RELEASED';

  let format = (item.kind || 'tv').toUpperCase();

  let description = cleanBBCode(item.description || '');
  if (hasCyrillic(description) || !description) {
    description = `Experience the thrilling adventures, story progression, and characters in ${english || romaji}.`;
  }

  return {
    id,
    idMal: id,
    title: {
      romaji,
      english,
      native,
    },
    coverImage: {
      extraLarge: poster,
      large: item.poster?.mainUrl || poster,
      color: '#ffe9b0',
    },
    bannerImage: banner,
    description,
    averageScore: item.score ? Math.round(item.score * 10) : 80,
    popularity: 100000,
    episodes: item.episodes || item.episodesAired || 12,
    seasonYear: item.airedOn?.year || 2024,
    season: (item.season || 'WINTER').toUpperCase(),
    status,
    format,
    genres: (item.genres || []).map((g) => g.name),
    studios: {
      nodes: (item.studios || []).map((s) => ({ id: s.id, name: s.name })),
    },
    trailer,
    nextAiringEpisode: null,
  };
}

export async function fetchShikimori(query, variables = {}, revalidate = 1800) {
  try {
    const res = await fetch(SHIKIMORI_GRAPHQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'AnimeStop/2.0',
      },
      body: JSON.stringify({ query, variables }),
      next: { revalidate },
    });

    if (!res.ok) {
      console.warn(`Shikimori GraphQL status ${res.status}`);
      return null;
    }

    const json = await res.json();
    if (json.errors) {
      console.warn('Shikimori GraphQL errors:', JSON.stringify(json.errors, null, 2));
    }
    return json.data;
  } catch (err) {
    console.warn('Shikimori fetch error:', err.message);
    return null;
  }
}

export async function getShikimoriHomeFeed() {
  const query1 = `
    query {
      spotlight: animes(limit: 6, order: popularity, status: "ongoing", kind: "tv") {
        id
        malId
        name
        english
        japanese
        score
        episodes
        episodesAired
        kind
        status
        airedOn { year }
        poster { originalUrl mainUrl }
        screenshots { originalUrl }
        genres { id name }
        description
        videos { id url name kind }
      }
      trending: animes(limit: 16, order: popularity) {
        id
        malId
        name
        english
        japanese
        score
        episodes
        episodesAired
        kind
        status
        airedOn { year }
        poster { originalUrl mainUrl }
        screenshots { originalUrl }
        genres { id name }
        videos { id url name kind }
      }
    }
  `;

  const query2 = `
    query {
      topAiring: animes(limit: 16, status: "ongoing", order: popularity) {
        id
        malId
        name
        english
        japanese
        score
        episodes
        episodesAired
        kind
        status
        airedOn { year }
        poster { originalUrl mainUrl }
        screenshots { originalUrl }
        genres { id name }
        videos { id url name kind }
      }
      popular: animes(limit: 16, order: ranked) {
        id
        malId
        name
        english
        japanese
        score
        episodes
        episodesAired
        kind
        status
        airedOn { year }
        poster { originalUrl mainUrl }
        screenshots { originalUrl }
        genres { id name }
        videos { id url name kind }
      }
    }
  `;

  const [data1, data2] = await Promise.all([
    fetchShikimori(query1, {}, 1800),
    fetchShikimori(query2, {}, 1800),
  ]);

  if (!data1 && !data2) return null;

  const spotlight = (data1?.spotlight || []).map(mapShikimoriAnime).filter(Boolean);
  const trending = (data1?.trending || []).map(mapShikimoriAnime).filter(Boolean);
  const topAiring = (data2?.topAiring || []).map(mapShikimoriAnime).filter(Boolean);
  const popular = (data2?.popular || []).map(mapShikimoriAnime).filter(Boolean);
  const seasonal = topAiring;

  return {
    spotlight: spotlight.length > 0 ? spotlight : trending.slice(0, 6),
    trending,
    topAiring,
    popular,
    seasonal,
  };
}

export async function getShikimoriAnimeDetails(id) {
  const numericId = String(id);
  const query = `
    query GetAnimeDetails($ids: String) {
      animes(ids: $ids, limit: 1) {
        id
        malId
        name
        english
        japanese
        synonyms
        kind
        rating
        score
        status
        episodes
        episodesAired
        duration
        airedOn { year month day }
        season
        poster { originalUrl mainUrl }
        screenshots { originalUrl }
        genres { id name }
        studios { id name }
        description
        videos { id url name kind }
      }
    }
  `;

  const data = await fetchShikimori(query, { ids: numericId }, 3600);
  const item = data?.animes?.[0];
  if (!item) return null;

  const mapped = mapShikimoriAnime(item);

  // If description has Russian text or is default/missing, fetch the official English synopsis
  if (hasCyrillic(item.description) || !item.description) {
    try {
      const searchTitle = item.english || item.name;
      const englishMeta = await fetchEnglishSynopsis(item.malId || item.id, searchTitle);
      if (englishMeta?.synopsis) {
        mapped.description = englishMeta.synopsis;
      }
      if (englishMeta?.englishTitle && !hasCyrillic(englishMeta.englishTitle)) {
        mapped.title.english = englishMeta.englishTitle;
      }
    } catch (e) {}
  }

  return {
    ...mapped,
    characters: { edges: [] },
    relations: { edges: [] },
    recommendations: { nodes: [] },
  };
}

export async function searchShikimoriAnime({
  q = '',
  genre = '',
  format = '',
  season = '',
  year = null,
  sort = 'trending',
  page = 1,
  per_page = 20,
}) {
  const orderMap = {
    trending: 'popularity',
    popular: 'ranked',
    score: 'ranked',
    newest: 'aired_on',
    favorites: 'ranked',
  };

  const limit = Math.min(parseInt(per_page, 10) || 20, 50);
  const pageNum = parseInt(page, 10) || 1;
  const order = orderMap[sort] || 'popularity';

  const query = `
    query SearchShikimori($search: String, $page: Int, $limit: Int, $order: OrderEnum) {
      animes(search: $search, page: $page, limit: $limit, order: $order) {
        id
        malId
        name
        english
        japanese
        score
        episodes
        episodesAired
        kind
        status
        airedOn { year }
        poster { originalUrl mainUrl }
        screenshots { originalUrl }
        genres { id name }
        videos { id url name kind }
      }
    }
  `;

  const variables = {
    search: q && q.trim() ? q.trim() : undefined,
    page: pageNum,
    limit,
    order,
  };

  const data = await fetchShikimori(query, variables, 600);
  const list = (data?.animes || []).map(mapShikimoriAnime).filter(Boolean);

  return {
    results: list,
    pageInfo: {
      total: list.length * 10,
      currentPage: pageNum,
      hasNextPage: list.length === limit,
    },
  };
}
