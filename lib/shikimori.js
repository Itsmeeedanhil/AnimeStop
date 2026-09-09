const SHIKIMORI_GRAPHQL = 'https://shikimori.one/api/graphql';

function mapShikimoriAnime(item) {
  if (!item) return null;
  const id = parseInt(item.malId || item.id, 10);
  const romaji = item.name || 'Anime';
  const english = item.english || item.name || 'Anime';
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
    description: (item.description || '').replace(/\[Written by MAL Rewrite\]/g, '').trim(),
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
