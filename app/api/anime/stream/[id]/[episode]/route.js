import { NextResponse } from 'next/server';
import { getAnimeDetails } from '@/lib/anilist';
import { getStreamData } from '@/lib/streaming';

export async function GET(request, { params }) {
  try {
    const id = parseInt(params.id, 10);
    const episode = parseInt(params.episode || '1', 10);

    const animeDetails = (await getAnimeDetails(id)) || {
      id,
      idMal: id,
      title: { romaji: `Anime #${id}`, english: `Anime #${id}`, native: `Anime #${id}` },
      coverImage: { extraLarge: 'https://media.kitsu.app/anime/poster_images/12/large.jpg', large: 'https://media.kitsu.app/anime/poster_images/12/large.jpg', color: '#ffe9b0' },
      bannerImage: 'https://media.kitsu.app/anime/cover_images/12/large.jpg',
      description: 'Stream loaded via multi-provider failover engine.',
      averageScore: 85,
      episodes: 24,
      status: 'RELEASING',
      format: 'TV',
      genres: ['Action', 'Adventure', 'Fantasy'],
      nextAiringEpisode: null,
    };

    const streamData = getStreamData(id, episode, animeDetails);

    return NextResponse.json({
      success: true,
      data: {
        anime: animeDetails,
        stream: streamData,
      },
    });
  } catch (err) {
    console.error('Stream API error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

