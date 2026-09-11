export function resolveStreamingServers(tmdbId, seasonNumber = 1, episodeNumber = 1, isMovie = false) {
  const numericId = parseInt(tmdbId, 10);
  const sNum = parseInt(seasonNumber, 10) || 1;
  const epNum = parseInt(episodeNumber, 10) || 1;

  if (isMovie) {
    return [
      {
        id: 'zoryva',
        name: 'Zoryva X',
        url: `https://vidsrc.to/embed/movie/${numericId}`,
      },
      {
        id: 'vidsrc',
        name: 'VidSrc',
        url: `https://vidsrc.me/embed/movie?tmdb=${numericId}`,
      },
      {
        id: 'videasy',
        name: 'Videasy',
        url: `https://player.videasy.net/movie/${numericId}`,
      },
      {
        id: 'vidcore',
        name: 'VidCore',
        url: `https://vidsrc.cc/v2/embed/movie/${numericId}`,
      },
      {
        id: 'cinesrc',
        name: 'CineSrc',
        url: `https://vidlink.pro/movie/${numericId}?primaryColor=ffe9b0&secondaryColor=121414`,
      },
    ];
  }

  return [
    {
      id: 'zoryva',
      name: 'Zoryva X',
      url: `https://vidsrc.to/embed/tv/${numericId}/${sNum}/${epNum}`,
    },
    {
      id: 'vidsrc',
      name: 'VidSrc',
      url: `https://vidsrc.me/embed/tv?tmdb=${numericId}&season=${sNum}&episode=${epNum}`,
    },
    {
      id: 'videasy',
      name: 'Videasy',
      url: `https://player.videasy.net/tv/${numericId}/${sNum}/${epNum}`,
    },
    {
      id: 'vidcore',
      name: 'VidCore',
      url: `https://vidsrc.cc/v2/embed/tv/${numericId}/${sNum}/${epNum}`,
    },
    {
      id: 'cinesrc',
      name: 'CineSrc',
      url: `https://vidlink.pro/tv/${numericId}/${sNum}/${epNum}?primaryColor=ffe9b0&secondaryColor=121414`,
    },
  ];
}

export function getStreamData(animeId, episode = 1, animeDetails = null, season = 1, seasonEpisodes = []) {
  const isMovie = animeDetails?.isMovie || animeDetails?.format === 'MOVIE';
  // Guarantee using the canonical TMDB ID
  const resolvedTmdbId = animeDetails?.tmdbId || animeDetails?.id || parseInt(animeId, 10);
  const sNum = parseInt(season, 10) || 1;
  const epNum = parseInt(episode, 10) || 1;

  const title = animeDetails?.title?.english || animeDetails?.title?.romaji || `Episode ${epNum}`;
  const banner = animeDetails?.bannerImage || animeDetails?.coverImage?.extraLarge || null;
  const trailerId = animeDetails?.trailer?.id || null;

  const trailerEmbedUrl = trailerId
    ? `https://www.youtube.com/embed/${trailerId}?autoplay=1&rel=0`
    : `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(title + ' anime official trailer')}`;

  const servers = resolveStreamingServers(resolvedTmdbId, sNum, epNum, isMovie);
  const defaultStreamUrl = servers[0]?.url || trailerEmbedUrl;

  let episodesList = [];

  if (isMovie) {
    episodesList = [
      {
        number: 1,
        seasonNumber: 1,
        title: title,
        duration: animeDetails?.duration ? `${animeDetails.duration}m` : '1h 45m',
        thumbnail: banner || animeDetails?.coverImage?.extraLarge,
        synopsis: animeDetails?.description || 'Full Anime Movie',
        isCurrent: true,
        isReleased: true,
      },
    ];
  } else if (Array.isArray(seasonEpisodes) && seasonEpisodes.length > 0) {
    episodesList = seasonEpisodes.map((ep) => ({
      number: ep.number,
      seasonNumber: sNum,
      title: ep.title || `Episode ${ep.number}`,
      duration: ep.duration || '24m',
      thumbnail: ep.thumbnail || banner || animeDetails?.coverImage?.extraLarge,
      synopsis: ep.synopsis || `Episode ${ep.number} of Season ${sNum}.`,
      airDate: ep.airDate,
      isCurrent: ep.number === epNum,
      isReleased: ep.isReleased !== false,
    }));
  } else {
    const totalCount = animeDetails?.episodes || 12;
    for (let i = 1; i <= totalCount; i++) {
      episodesList.push({
        number: i,
        seasonNumber: sNum,
        title: `Episode ${i}`,
        duration: '24m',
        thumbnail: banner || animeDetails?.coverImage?.extraLarge,
        synopsis: `Episode ${i} follows the story progression.`,
        isCurrent: i === epNum,
        isReleased: true,
      });
    }
  }

  const currentEpObj = episodesList.find((e) => e.number === epNum) || episodesList[0];

  return {
    animeId: resolvedTmdbId,
    tmdbId: resolvedTmdbId,
    originalQueryId: parseInt(animeId, 10),
    currentSeason: sNum,
    currentEpisode: epNum,
    isMovie,
    title,
    banner,
    isUnreleased: currentEpObj?.isReleased === false,
    isCurrentEpisodeReleased: currentEpObj?.isReleased !== false,
    releasedEpisodesCount: episodesList.filter((e) => e.isReleased).length,
    totalEpisodesCount: episodesList.length,
    totalEpisodes: episodesList.length,
    status: animeDetails?.status || 'FINISHED',
    streamUrl: defaultStreamUrl,
    trailerUrl: trailerEmbedUrl,
    servers,
    seasons: animeDetails?.seasons || [],
    episodes: episodesList,
  };
}