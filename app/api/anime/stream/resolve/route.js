import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const animeId = searchParams.get('animeId');
    const episode = searchParams.get('episode') || '1';
    const server = searchParams.get('server') || 'ani'; // 'ani', 'hd-1', 'hd-2', 'mal'
    const malId = searchParams.get('malId');

    if (!animeId) {
      return NextResponse.json({ success: false, message: 'Anime ID is required' }, { status: 400 });
    }

    let embedPath = `/ani/${animeId}/${episode}/sub`;
    if (server === 'hd-1') embedPath = `/hd-1/ani/${animeId}/${episode}/sub`;
    if (server === 'hd-2') embedPath = `/hd-2/ani/${animeId}/${episode}/sub`;
    if (server === 'mal' && malId) embedPath = `/hd-1/mal/${malId}/${episode}/sub`;

    const embedUrl = `https://cdn.4animo.xyz/embed${embedPath}`;

    const embedRes = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      next: { revalidate: 300 },
    });

    if (!embedRes.ok) {
      return NextResponse.json({ success: false, message: 'Failed to access embed stream' }, { status: embedRes.status });
    }

    const html = await embedRes.text();
    const match = html.match(/var sourcesUrl\s*=\s*['"]([^'"]+)['"]/);
    if (!match) {
      return NextResponse.json({ success: false, message: 'Source resolver token not found' }, { status: 404 });
    }

    const getSourcesUrl = 'https://cdn.4animo.xyz' + match[1];
    const sourcesRes = await fetch(getSourcesUrl, {
      headers: {
        'Referer': embedUrl,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
      },
      next: { revalidate: 300 },
    });

    if (!sourcesRes.ok) {
      return NextResponse.json({ success: false, message: 'Sources endpoint failed' }, { status: sourcesRes.status });
    }

    const data = await sourcesRes.json();
    const hlsPath = data.sources?.[0]?.file;
    if (!hlsPath) {
      return NextResponse.json({ success: false, message: 'No direct video stream returned' }, { status: 404 });
    }

    const fullHlsUrl = 'https://cdn.4animo.xyz' + hlsPath;
    const tracks = (data.tracks || []).map((t) => ({
      url: 'https://cdn.4animo.xyz' + t.file,
      label: t.label,
      kind: t.kind || 'captions',
      default: Boolean(t.default || t.label?.toLowerCase().includes('english')),
    }));

    const englishTrack = tracks.find((t) => t.default || t.label?.toLowerCase().includes('english')) || tracks[0] || null;

    return NextResponse.json({
      success: true,
      data: {
        hlsUrl: fullHlsUrl,
        subtitles: tracks,
        activeSubtitle: englishTrack ? englishTrack.url : null,
        intro: data.intro || null,
        outro: data.outro || null,
        server: data.server || server,
      },
    });
  } catch (err) {
    console.error('Stream resolver error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

