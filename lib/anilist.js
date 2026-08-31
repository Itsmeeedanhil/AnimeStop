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
      console.error('AniList HTTP error:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    return data.data;
  } catch (err) {
    console.error('AniList fetch error:', err);
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

  const data = await fetchAniList(query, {}, 1800);
  if (!data) return null;

  return {
    spotlight: data.spotlight?.media || [],
    trending: data.trending?.media || [],
    topAiring: data.topAiring?.media || [],
    popular: data.popular?.media || [],
    seasonal: data.seasonal?.media || [],
  };
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

  const data = await fetchAniList(query, { id: parseInt(id, 10) }, 3600);
  return data?.Media || null;
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

  const data = await fetchAniList(query, variables, 600);
  return {
    results: data?.Page?.media || [],
    pageInfo: data?.Page?.pageInfo || { total: 0, currentPage: 1, hasNextPage: false },
  };
}

export function getGenres() {
  return [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy', 'Horror',
    'Mahou Shoujo', 'Mecha', 'Music', 'Mystery', 'Psychological', 'Romance',
    'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'
  ];
}

