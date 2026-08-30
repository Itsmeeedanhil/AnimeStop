import { NextResponse } from 'next/server';
import { searchAnime } from '@/lib/anilist';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const genre = searchParams.get('genre') || '';
    const format = searchParams.get('format') || '';
    const season = searchParams.get('season') || '';
    const year = searchParams.get('year') || null;
    const sort = searchParams.get('sort') || 'trending';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const per_page = parseInt(searchParams.get('per_page') || '20', 10);

    const data = await searchAnime({
      q,
      genre,
      format,
      season,
      year,
      sort,
      page,
      per_page,
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Search API error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

