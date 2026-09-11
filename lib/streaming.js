import { getTmdbFromIds } from './tmdbMapping';

export function resolveStreamingServers(anilistId, episodeNumber = 1, malId = null, animeDetails = null) {
  const isMovieFormat = animeDetails?.format === 'MOVIE';
  const tmdbInfo = getTmdbFromIds(anilistId, malId);
  const tmdbId = tmdbInfo?.tmdbId || null;
  const isMovie = isMovieFormat || tmdbInfo?.type === 'movie';
  const seasonNumber = 1;

  const servers = [];

  if (tmdbId) {
    if (isMovie) {
      servers.push(
        {
          id: 'zoryva',
          name: 'Zoryva HD',
          url: `https://vidlink.pro/movie/${tmdbId}?primaryColor=ffe9b0&secondaryColor=121414`,
        },
        {
          id: 'vidsrc-to',
          name: 'VidSrc TO',
          url: `https://vidsrc.to/embed/movie/${tmdbId}`,
        },
        {
          id: 'vidsrc-me',
          name: 'VidSrc ME',
          url: `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`,
        },
        {
          id: '2embed',
          name: '2Embed Cinema',
          url: `https://www.2embed.cc/embed/${tmdbId}`,
        },
        {
          id: 'multiembed',
          name: 'MultiEmbed',
          url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`,
        }
      );
    } else {
      servers.push(
        {
          id: 'zoryva',
          name: 'Zoryva HD',
          url: `https://vidlink.pro/tv/${tmdbId}/${seasonNumber}/${episodeNumber}?primaryColor=ffe9b0&secondaryColor=121414`,
        },
        {
          id: 'vidsrc-to',
          name: 'VidSrc TO',
          url: `https://vidsrc.to/embed/tv/${tmdbId}/${seasonNumber}/${episodeNumber}`,
        },
        {
          id: 'vidsrc-me',
          name: 'VidSrc ME',
          url: `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${seasonNumber}&episode=${episodeNumber}`,
        },
        {
          id: '2embed',
          name: '2Embed TV',
          url: `https://www.2embed.cc/embedtv/${tmdbId}&s=${seasonNumber}&e=${episodeNumber}`,
        },
        {
          id: 'multiembed',
          name: 'MultiEmbed',
          url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${seasonNumber}&e=${episodeNumber}`,
        }
      );
    }
  }

  // Always include Universal AniList Resolver as well
  servers.push({
    id: 'vidsrc-ani',
    name: 'VidSrc Anime',
    url: `https://vidsrc.me/embed/anime?anilist=${anilistId}&ep=${episodeNumber}`,
  });

  return servers;
}

export function getStreamData(animeId, episode = 1, animeDetails = null) {
  const totalEpisodes = animeDetails?.episodes || animeDetails?.episodesAired || null;
  const episodesAired = animeDetails?.episodesAired !== undefined && animeDetails?.episodesAired !== null ? parseInt(animeDetails.episodesAired, 10) : null;
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
    if (episodesAired !== null && episodesAired !== undefined) {
      releasedEpisodesCount = episodesAired;
    } else if (nextAiring?.episode) {
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

  const isCurrentEpisodeReleased = (status === 'FINISHED') || (releasedEpisodesCount > 0 && episode <= releasedEpisodesCount);
  const isUnreleased = status === 'NOT_YET_RELEASED' || releasedEpisodesCount === 0 || !isCurrentEpisodeReleased;
  const targetId = animeDetails?.idMal || animeId;

  const trailerEmbedUrl = trailerId
    ? `https://www.youtube.com/embed/${trailerId}?autoplay=1&rel=0`
    : `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(title + ' anime official trailer')}`;

  const servers = resolveStreamingServers(animeId, episode, targetId, animeDetails);
  const defaultStreamUrl = isCurrentEpisodeReleased ? (servers[0]?.url || '') : trailerEmbedUrl;

  const isValidThumb = (url) => {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase();
    return (
      !lower.includes('no_image') &&
      !lower.includes('no-image') &&
      !lower.includes('noimage') &&
      !lower.includes('placeholder') &&
      !lower.includes('default_episode') &&
      !lower.includes('default.jpg') &&
      !lower.includes('default.png') &&
      !lower.includes('default.jpeg') &&
      !lower.includes('/default')
    );
  };

  const streamingEpisodes = Array.isArray(animeDetails?.streamingEpisodes) ? animeDetails.streamingEpisodes : [];
  const characterImages = (animeDetails?.characters?.edges || [])
    .map((e) => e?.node?.image?.large || e?.node?.image?.medium)
    .filter(Boolean)
    .filter(isValidThumb);

  const fallbackBanner = banner || animeDetails?.coverImage?.extraLarge || animeDetails?.coverImage?.large;

  const totalCount = Math.max(
    parseInt(totalEpisodes || 12, 10),
    releasedEpisodesCount,
    episode
  );
  const count = Math.min(totalCount, 2000);
  const episodesList = [];

  for (let i = 1; i <= count; i++) {
    const isReleased = (status === 'FINISHED') || (releasedEpisodesCount > 0 && i <= releasedEpisodesCount);
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
      if (isValidThumb(matchingStreamEp.thumbnail)) {
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

    // 2. If no valid official streaming thumbnail, use distinct character visuals or high-res banner artwork
    if (!episodeThumb || !isValidThumb(episodeThumb)) {
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
      synopsis: isReleased
        ? `Episode ${i} follows the story progression and encounters in this released episode.`
        : `Episode ${i} is upcoming and has not aired yet.`,
      isCurrent: i === episode,
      isReleased,
    });
  }

  return {
    animeId,
    currentEpisode: episode,
    title,
    banner,
    isUnreleased,
    isCurrentEpisodeReleased,
    releasedEpisodesCount,
    totalEpisodesCount: count,
    status,
    nextAiring,
    totalEpisodes: count,
    streamUrl: defaultStreamUrl,
    trailerUrl: trailerEmbedUrl,
    servers,
    episodes: episodesList,
  };
}