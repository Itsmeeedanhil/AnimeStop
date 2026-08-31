import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const animeId = searchParams.get('animeId');
    const episode = searchParams.get('episode') || '1';
    const server = searchParams.get('server') || 'ani';
    const malId = searchParams.get('malId');

    if (!animeId) {
      return NextResponse.json({ success: false, message: 'Anime ID is required' }, { status: 400 });
    }

    const candidateServers = [
      server,
      server === 'ani' ? 'hd-1' : 'ani',
      'hd-2',
      malId ? 'mal' : null,
    ].filter(Boolean);

    for (const srv of candidateServers) {
      try {
        let embedPath = `/ani/${animeId}/${episode}/sub`;
        if (srv === 'hd-1') embedPath = `/hd-1/ani/${animeId}/${episode}/sub`;
        if (srv === 'hd-2') embedPath = `/hd-2/ani/${animeId}/${episode}/sub`;
        if (srv === 'mal' && malId) embedPath = `/hd-1/mal/${malId}/${episode}/sub`;

        const embedUrl = `https://cdn.4animo.xyz/embed${embedPath}`;

        const embedRes = await fetch(embedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          cache: 'no-store',
        });

        if (!embedRes.ok) continue;

        const html = await embedRes.text();
        const match = html.match(/var sourcesUrl\s*=\s*['"]([^'"]+)['"]/);
        if (!match) continue;

        const getSourcesUrl = 'https://cdn.4animo.xyz' + match[1];
        const sourcesRes = await fetch(getSourcesUrl, {
          headers: {
            'Referer': embedUrl,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
          },
          cache: 'no-store',
        });

        if (!sourcesRes.ok) continue;

        const data = await sourcesRes.json();
        const hlsPath = data.sources?.[0]?.file;
        if (!hlsPath) continue;

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
            server: data.server || srv,
          },
        });
      } catch (err) {
        // Try next candidate
      }
    }

    return NextResponse.json({ success: false, message: 'Could not resolve direct HLS stream from any mirror' }, { status: 404 });
  } catch (err) {
    console.error('Stream resolver top error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
