import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return NextResponse.json({ success: false, message: 'Valid HTTP/HTTPS subtitle URL is required' }, { status: 400 });
    }

    // Fetch subtitle text with standard headers
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/plain, text/vtt, application/x-subrip, */*',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ success: false, message: `Remote server responded with HTTP ${res.status}` }, { status: res.status });
    }

    const text = await res.text();

    return NextResponse.json({
      success: true,
      data: {
        content: text,
        url,
      },
    });
  } catch (err) {
    console.error('Subtitle fetch error:', err);
    return NextResponse.json({ success: false, message: err.message || 'Failed to fetch subtitle file' }, { status: 500 });
  }
}
