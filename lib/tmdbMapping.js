import animeTmdbMap from '@/data/anime-tmdb-map.json';

/**
 * Resolves TMDB ID and media type ('tv' | 'movie') from AniList ID or MAL ID.
 * @param {number|string} anilistId
 * @param {number|string} [malId]
 * @returns {{ tmdbId: number, type: 'tv' | 'movie' } | null}
 */
export function getTmdbFromIds(anilistId, malId = null) {
  if (anilistId && animeTmdbMap[`a_${anilistId}`]) {
    const [tmdbId, isMovie] = animeTmdbMap[`a_${anilistId}`];
    return { tmdbId, type: isMovie ? 'movie' : 'tv' };
  }
  if (malId && animeTmdbMap[`m_${malId}`]) {
    const [tmdbId, isMovie] = animeTmdbMap[`m_${malId}`];
    return { tmdbId, type: isMovie ? 'movie' : 'tv' };
  }
  return null;
}

