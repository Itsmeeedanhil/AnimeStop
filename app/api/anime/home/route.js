import { NextResponse } from 'next/server';
import { getHomeFeed } from '@/lib/anilist';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const feed = await getHomeFeed();
    if (!feed) {
      return NextResponse.json({ success: false, message: 'Failed to fetch anime feed' }, { status: 500 });
    }
    return NextResponse.json({ success: true, data: feed });
  } catch (err) {
    console.error('Home feed API error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

