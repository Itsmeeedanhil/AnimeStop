import animeTmdbMap from '@/data/anime-tmdb-map.json';

/**
 * Resolves TMDB ID, media type ('tv' | 'movie'), season number, and episode offset from AniList ID or MAL ID.
 * @param {number|string} anilistId
 * @param {number|string} [malId]
 * @returns {{ tmdbId: number, type: 'tv' | 'movie', season: number, episodeOffset: number } | null}
 */
const SPECIAL_OVERRIDES = {
  // Bleach: Thousand-Year Blood War
  '149939': { tmdbId: 30984, type: 'tv', season: 2, episodeOffset: 0 },
  '41467': { tmdbId: 30984, type: 'tv', season: 2, episodeOffset: 0 },
  '159322': { tmdbId: 30984, type: 'tv', season: 2, episodeOffset: 13 },
  '53580': { tmdbId: 30984, type: 'tv', season: 2, episodeOffset: 13 },
  '169756': { tmdbId: 30984, type: 'tv', season: 2, episodeOffset: 26 },
  '60636': { tmdbId: 30984, type: 'tv', season: 2, episodeOffset: 26 },
  '57706': { tmdbId: 30984, type: 'tv', season: 2, episodeOffset: 26 },
  '175788': { tmdbId: 30984, type: 'tv', season: 2, episodeOffset: 26 },
  '176496': { tmdbId: 30984, type: 'tv', season: 2, episodeOffset: 26 },
};

export function getTmdbFromIds(anilistId, malId = null) {
  if (anilistId && SPECIAL_OVERRIDES[String(anilistId)]) {
    return SPECIAL_OVERRIDES[String(anilistId)];
  }
  if (malId && SPECIAL_OVERRIDES[String(malId)]) {
    return SPECIAL_OVERRIDES[String(malId)];
  }

  const entry = (anilistId && animeTmdbMap[`a_${anilistId}`]) ||
                (anilistId && animeTmdbMap[`m_${anilistId}`]) ||
                (malId && animeTmdbMap[`m_${malId}`]) ||
                (malId && animeTmdbMap[`a_${malId}`]) ||
                null;
  if (!entry) return null;

  const [tmdbId, isMovie, season = 1, episodeOffset = 0] = entry;
  return {
    tmdbId,
    type: isMovie ? 'movie' : 'tv',
    season: season || 1,
    episodeOffset: episodeOffset || 0,
  };
}

