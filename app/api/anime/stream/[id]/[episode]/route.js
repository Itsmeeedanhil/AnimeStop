import { NextResponse } from 'next/server';
import { getAnimeDetails } from '@/lib/anilist';
import { getStreamData } from '@/lib/streaming';

export async function GET(request, { params }) {
  try {
    const id = parseInt(params.id, 10);
    const episode = parseInt(params.episode || '1', 10);

    const animeDetails = await getAnimeDetails(id);
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

