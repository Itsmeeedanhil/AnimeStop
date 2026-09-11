import { NextResponse } from 'next/server';
import { ANIME_GENRES } from '@/lib/tmdb';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: ANIME_GENRES,
  });
}
