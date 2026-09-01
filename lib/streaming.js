export function resolveStreamingServers(anilistId, episodeNumber = 1, malId = null) {
  const targetMalId = malId || anilistId;
  const embedBaseUrl = 'https://cdn.4animo.xyz/embed';
  const adFreeParams = 'k=1&clean=1&adblock=1&autoPlay=1';

  const serversList = [
    {
      id: 'cinesrc',
      name: 'CineSrc',
      badge: 'MegaCloud HD',
      url: `${embedBaseUrl}/hd-1/ani/${anilistId}/${episodeNumber}/sub?${adFreeParams}`,
    },
    {
      id: 'vidsrc',
      name: 'VidSrc',
      badge: 'VidStreaming HD',
      url: `${embedBaseUrl}/hd-2/ani/${anilistId}/${episodeNumber}/sub?${adFreeParams}`,
    },
    {
      id: 'zoryva',
      name: 'Zoryva',
      badge: 'MAL HD-1',
      url: `${embedBaseUrl}/hd-1/mal/${targetMalId}/${episodeNumber}/sub?${adFreeParams}`,
    },
    {
      id: 'vidcore',
      name: 'VidCore',
      badge: 'MAL HD-2',
      url: `${embedBaseUrl}/hd-2/mal/${targetMalId}/${episodeNumber}/sub?${adFreeParams}`,
    },
    {
      id: 'videasy',
      name: 'Videasy',
      badge: 'Direct Stream',
      url: `${embedBaseUrl}/ani/${anilistId}/${episodeNumber}/sub?${adFreeParams}`,
    },
  ];

  return serversList;
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

  const streamingEpisodes = Array.isArray(animeDetails?.streamingEpisodes) ? animeDetails.streamingEpisodes : [];
  const characterImages = (animeDetails?.characters?.edges || [])
    .map((e) => e?.node?.image?.large)
    .filter(Boolean);

  const episodesList = [];
  const count = Math.min(releasedEpisodesCount, 2000);

  for (let i = 1; i <= count; i++) {
    let episodeThumb = null;
    let episodeTitle = `Episode ${i}`;

    // 1. Try finding official streaming episode thumbnail & title from AniList
    const matchingStreamEp =
      streamingEpisodes.find((se) => {
        const t = (se.title || '').toLowerCase();
        return (
          t.includes(`episode ${i} `) ||
          t.includes(`episode ${i}:`) ||
          t.includes(`episode ${i}-`) ||
          t.includes(`ep ${i} `) ||
          t.includes(`ep. ${i} `) ||
          t.endsWith(`episode ${i}`) ||
          t.endsWith(`ep ${i}`) ||
          t === `episode ${i}`
        );
      }) || streamingEpisodes[i - 1];

    if (matchingStreamEp) {
      if (matchingStreamEp.thumbnail) {
        episodeThumb = matchingStreamEp.thumbnail;
      }
      if (matchingStreamEp.title) {
        let cleanTitle = matchingStreamEp.title.trim();
        if (cleanTitle.match(/^episode\s+\d+[\s:–—-]+/i)) {
          cleanTitle = cleanTitle.replace(/^episode\s+\d+[\s:–—-]+/i, '').trim();
        } else if (cleanTitle.match(/^ep\.?\s*\d+[\s:–—-]+/i)) {
          cleanTitle = cleanTitle.replace(/^ep\.?\s*\d+[\s:–—-]+/i, '').trim();
        } else if (cleanTitle.match(/^\d+[\s:–—-]+/)) {
          cleanTitle = cleanTitle.replace(/^\d+[\s:–—-]+/, '').trim();
        }
        episodeTitle = cleanTitle || matchingStreamEp.title;
      }
    }

    // 2. If no official streaming thumbnail, use distinct character visuals or fallback artwork
    if (!episodeThumb) {
      if (characterImages.length > 0) {
        episodeThumb = characterImages[(i - 1) % characterImages.length];
      } else {
        episodeThumb = banner || animeDetails?.coverImage?.extraLarge || animeDetails?.coverImage?.large;
      }
    }

    episodesList.push({
      number: i,
      title: episodeTitle,
      duration: animeDetails?.duration ? `${animeDetails.duration}m` : '24m',
      thumbnail: episodeThumb,
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