import { NextResponse } from 'next/server';
import { searchAnime } from '@/lib/tmdb';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || searchParams.get('query') || '';
    const genre = searchParams.get('genre') || '';
    const format = searchParams.get('format') || 'all';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const sort = searchParams.get('sort') || 'popularity.desc';
    const status = searchParams.get('status') || '';

    const type = format.toLowerCase() === 'movie' ? 'movie' : format.toLowerCase() === 'tv' ? 'tv' : 'all';

    const data = await searchAnime(q, page, type, genre, sort, status);

    return NextResponse.json({
      success: true,
      data: {
        page: data.page,
        totalPages: data.totalPages,
        totalResults: data.totalResults,
        results: data.results,
        // Compatibility for any components expecting media array
        media: data.results,
        pageInfo: {
          currentPage: data.page,
          hasNextPage: data.page < data.totalPages,
          lastPage: data.totalPages,
          total: data.totalResults,
        },
      },
    });
  } catch (err) {
    console.error('Search API error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
