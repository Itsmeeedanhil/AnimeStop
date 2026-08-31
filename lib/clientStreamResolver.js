/**
 * Client-Side Direct HLS Stream & Subtitle Extractor
 * Executes in the user's browser to bypass serverless datacenter IP blocks.
 */

export async function resolveStreamSources(animeId, episode = 1, server = 'ani', malId = null) {
  if (!animeId) return null;

  // 1. First try our Next.js backend API
  try {
    const res = await fetch(
      `/api/anime/stream/resolve?animeId=${animeId}&episode=${episode}&server=${server}&malId=${malId || ''}`,
      { cache: 'no-store' }
    );
    if (res.ok) {
      const json = await res.json();
      if (json?.success && json?.data?.hlsUrl) {
        return json.data;
      }
    }
  } catch (err) {
    // Fall through to client-side resolver
  }

  // 2. Client-Side Browser Resolution (Runs on user's residential IP)
  let embedPath = `/ani/${animeId}/${episode}/sub`;
  if (server === 'hd-1') embedPath = `/hd-1/ani/${animeId}/${episode}/sub`;
  if (server === 'hd-2') embedPath = `/hd-2/ani/${animeId}/${episode}/sub`;
  if (server === 'mal' && malId) embedPath = `/hd-1/mal/${malId}/${episode}/sub`;

  const targetEmbedUrl = `https://cdn.4animo.xyz/embed${embedPath}`;

  const corsProxies = [
    (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  ];

  for (const proxyFn of corsProxies) {
    try {
      const proxiedEmbedUrl = proxyFn(targetEmbedUrl);
      const embedRes = await fetch(proxiedEmbedUrl, { cache: 'no-store' });
      if (!embedRes.ok) continue;

      const html = await embedRes.text();
      const match = html.match(/var sourcesUrl\s*=\s*['"]([^'"]+)['"]/);
      if (!match) continue;

      const getSourcesPath = match[1];
      const directSourcesUrl = `https://cdn.4animo.xyz${getSourcesPath}`;

      // Call getSources directly (cdn.4animo.xyz sends access-control-allow-origin: *)
      let sourcesData = null;
      try {
        const sourcesRes = await fetch(directSourcesUrl, {
          headers: {
            'Referer': targetEmbedUrl,
            'Accept': 'application/json, text/plain, */*',
          },
          cache: 'no-store',
        });
        if (sourcesRes.ok) {
          sourcesData = await sourcesRes.json();
        }
      } catch (e) {
        // Try proxied getSources
        const proxiedSourcesUrl = proxyFn(directSourcesUrl);
        const proxiedRes = await fetch(proxiedSourcesUrl, { cache: 'no-store' });
        if (proxiedRes.ok) {
          sourcesData = await proxiedRes.json();
        }
      }

      if (sourcesData?.sources?.[0]?.file) {
        const hlsPath = sourcesData.sources[0].file;
        const fullHlsUrl = `https://cdn.4animo.xyz${hlsPath}`;

        const tracks = (sourcesData.tracks || []).map((t) => ({
          url: `https://cdn.4animo.xyz${t.file}`,
          label: t.label,
          kind: t.kind || 'captions',
          default: Boolean(t.default || t.label?.toLowerCase().includes('english')),
        }));

        const englishTrack =
          tracks.find((t) => t.default || t.label?.toLowerCase().includes('english')) ||
          tracks[0] ||
          null;

        return {
          hlsUrl: fullHlsUrl,
          subtitles: tracks,
          activeSubtitle: englishTrack ? englishTrack.url : null,
          intro: sourcesData.intro || null,
          outro: sourcesData.outro || null,
          server: sourcesData.server || server,
        };
      }
    } catch (err) {
      // Try next proxy
    }
  }

  return null;
}

