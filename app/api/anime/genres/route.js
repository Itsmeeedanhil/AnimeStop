import { NextResponse } from 'next/server';
import { getGenres } from '@/lib/anilist';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: getGenres(),
  });
}

