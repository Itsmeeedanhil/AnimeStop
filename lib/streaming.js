export function resolveStreamingServers(anilistId, episodeNumber = 1, malId = null) {
  const targetMalId = malId || anilistId;
  const embedBaseUrl = 'https://cdn.4animo.xyz/embed';

  return [
    {
      id: '4animo-hd1',
      name: 'Server 1 (4Animo HD-1)',
      badge: 'MegaCloud',
      url: `${embedBaseUrl}/hd-1/ani/${anilistId}/${episodeNumber}/sub?autoPlay=1`,
    },
    {
      id: '4animo-hd2',
      name: 'Server 2 (4Animo HD-2)',
      badge: 'VidStreaming',
      url: `${embedBaseUrl}/hd-2/ani/${anilistId}/${episodeNumber}/sub?autoPlay=1`,
    },
    {
      id: '4animo-ani',
      name: 'Server 3 (4Animo Direct)',
      badge: 'Auto CDN',
      url: `${embedBaseUrl}/ani/${anilistId}/${episodeNumber}/sub?autoPlay=1`,
    },
  ];
}

export function getStreamData(animeId, episode = 1, animeDetails = null) {
  const totalEpisodes = animeDetails?.episodes || null;
  const englishTitle = animeDetails?.title?.english || null;
  const romajiTitle = animeDetails?.title?.romaji || null;
  const title = englishTitle || romajiTitle || `Episode ${episode}`;
  const banner = animeDetails?.bannerImage || animeDetails?.coverImage?.extraLarge || null;
  const trailerId = animeDetails?.trailer?.id || null;
  const status = animeDetails?.status || 'FINISHED';
  const nextAiring = animeDetails?.nextAiringEpisode || null;

  let releasedEpisodesCount = 0;

  if (status === 'NOT_YET_RELEASED') {
    releasedEpisodesCount = 0;
  } else if (status === 'RELEASING') {
    if (nextAiring?.episode) {
      releasedEpisodesCount = Math.max(0, parseInt(nextAiring.episode, 10) - 1);
    } else if (totalEpisodes) {
      releasedEpisodesCount = parseInt(totalEpisodes, 10);
    } else {
      releasedEpisodesCount = Math.max(1, episode);
    }
  } else if (status === 'FINISHED') {
    releasedEpisodesCount = parseInt(totalEpisodes || 12, 10);
  } else {
    releasedEpisodesCount = parseInt(totalEpisodes || 12, 10);
  }

  const isUnreleased = status === 'NOT_YET_RELEASED' || releasedEpisodesCount === 0;
  const targetId = animeDetails?.idMal || animeId;

  const trailerEmbedUrl = trailerId
    ? `https://www.youtube.com/embed/${trailerId}?autoplay=1&rel=0`
    : `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(title + ' anime official trailer')}`;

  const servers = resolveStreamingServers(animeId, episode, targetId);
  const defaultStreamUrl = isUnreleased ? trailerEmbedUrl : (servers[0]?.url || '');

  const episodesList = [];
  const count = Math.min(releasedEpisodesCount, 2000);

  for (let i = 1; i <= count; i++) {
    episodesList.push({
      number: i,
      title: `Episode ${i}`,
      duration: '24m',
      thumbnail: banner,
      synopsis: `Episode ${i} follows the story progression and encounters in this released episode.`,
      isCurrent: i === episode,
    });
  }

  return {
    animeId,
    currentEpisode: episode,
    title,
    banner,
    isUnreleased,
    status,
    nextAiring,
    totalEpisodes: releasedEpisodesCount,
    streamUrl: defaultStreamUrl,
    trailerUrl: trailerEmbedUrl,
    servers,
    episodes: episodesList,
  };
}
