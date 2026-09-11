import { NextResponse } from 'next/server';
import { getSeasonEpisodes } from '@/lib/tmdb';

export async function GET(request, { params }) {
  try {
    const id = parseInt(params.id, 10);
    const season = parseInt(params.season || '1', 10);

    const episodes = await getSeasonEpisodes(id, season);

    return NextResponse.json({
      success: true,
      data: episodes,
    });
  } catch (err) {
    console.error('Season Episodes API error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

