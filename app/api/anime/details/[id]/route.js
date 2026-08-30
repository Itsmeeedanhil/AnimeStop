import { NextResponse } from 'next/server';
import { getAnimeDetails } from '@/lib/anilist';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const details = await getAnimeDetails(id);

    if (!details) {
      return NextResponse.json({ success: false, message: 'Anime not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: details });
  } catch (err) {
    console.error('Details API error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

