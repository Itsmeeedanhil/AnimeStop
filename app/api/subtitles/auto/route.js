import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || '';
    const episode = parseInt(searchParams.get('episode') || '1', 10);
    const animeId = searchParams.get('animeId') || '';
    const malId = searchParams.get('malId') || '';

    if (!title && !animeId) {
      return NextResponse.json({ success: false, message: 'Anime title or ID is required' }, { status: 400 });
    }

    const cleanTitle = title.replace(/[:\-_\(\)]/g, ' ').replace(/\s+/g, ' ').trim();

    // 1. Try public subtitle providers & CDN caches
    const searchQueries = [
      `${cleanTitle} episode ${episode}`,
      `${cleanTitle} ep ${episode}`,
      `${cleanTitle} ${episode}`,
    ];

    // Public subtitle API endpoints (AnimeTosho / OpenSubtitles / Subdl mirrors)
    for (const query of searchQueries) {
      try {
        const toshoUrl = `https://animetosho.org/api/search?q=${encodeURIComponent(query + ' srt')}&format=json`;
        const res = await fetch(toshoUrl, {
          headers: { 'User-Agent': 'AnimeStop/2.0' },
          next: { revalidate: 3600 },
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const firstResult = data.find((item) =>
              (item.title?.toLowerCase().includes('.srt') || item.title?.toLowerCase().includes('.vtt') || item.torrent_name?.toLowerCase().includes('sub'))
            );

            if (firstResult?.attachment_url || firstResult?.torrent_url) {
              const fileUrl = firstResult.attachment_url || firstResult.torrent_url;
              if (fileUrl.endsWith('.srt') || fileUrl.endsWith('.vtt')) {
                const subRes = await fetch(fileUrl, { headers: { 'User-Agent': 'AnimeStop/2.0' } });
                if (subRes.ok) {
                  const text = await subRes.text();
                  if (text && (text.includes('-->') || text.includes('WEBVTT'))) {
                    return NextResponse.json({
                      success: true,
                      data: {
                        content: text,
                        source: 'AnimeTosho Subtitles',
                        fileName: `${cleanTitle}_ep${episode}.srt`,
                      },
                    });
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        // Continue to next query
      }
    }

    return NextResponse.json({
      success: false,
      message: 'No auto-matched online subtitle file found for this episode',
    });
  } catch (err) {
    console.error('Auto subtitle search error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

