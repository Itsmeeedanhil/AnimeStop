import animeTmdbMap from '@/data/anime-tmdb-map.json';

/**
 * Resolves TMDB ID, media type ('tv' | 'movie'), season number, and episode offset from AniList ID or MAL ID.
 * @param {number|string} anilistId
 * @param {number|string} [malId]
 * @returns {{ tmdbId: number, type: 'tv' | 'movie', season: number, episodeOffset: number } | null}
 */
export function getTmdbFromIds(anilistId, malId = null) {
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

