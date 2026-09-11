import { NextResponse } from 'next/server';
import { getAnimeDetails, getSeasonEpisodes } from '@/lib/tmdb';
import { getStreamData } from '@/lib/streaming';

export async function GET(request, { params }) {
  try {
    const id = parseInt(params.id, 10);
    const episode = parseInt(params.episode || '1', 10);

    const { searchParams } = new URL(request.url);
    const season = parseInt(searchParams.get('season') || '1', 10);

    const animeDetails = await getAnimeDetails(id);
    if (!animeDetails) {
      return NextResponse.json({ success: false, message: 'Anime not found on TMDB' }, { status: 404 });
    }

    let seasonEpisodes = [];
    if (!animeDetails.isMovie) {
      seasonEpisodes = await getSeasonEpisodes(id, season);
    }

    const streamData = getStreamData(id, episode, animeDetails, season, seasonEpisodes);

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
