import animeTmdbMap from '@/data/anime-tmdb-map.json';

/**
 * Resolves TMDB ID, media type ('tv' | 'movie'), TMDB season number, and episode offset.
 * @param {number|string} anilistId
 * @param {number|string} [malId]
 * @returns {{ tmdbId: number, type: 'tv' | 'movie', season: number, offset: number } | null}
 */
export function getTmdbFromIds(anilistId, malId = null) {
  let entry = null;
  if (anilistId && animeTmdbMap[`a_${anilistId}`]) {
    entry = animeTmdbMap[`a_${anilistId}`];
  } else if (malId && animeTmdbMap[`m_${malId}`]) {
    entry = animeTmdbMap[`m_${malId}`];
  }

  if (entry) {
    const [tmdbId, isMovie, season = 1, offset = 0] = entry;
    return {
      tmdbId,
      type: isMovie ? 'movie' : 'tv',
      season: season || 1,
      offset: offset || 0,
    };
  }

  return null;
}

