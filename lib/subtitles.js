/**
 * Utility to parse SRT, VTT, and plain subtitle text files into structured cue objects.
 */

export function parseSubtitles(content) {
  if (!content || typeof content !== 'string') return [];

  const cleanContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const cues = [];

  // Split by double line breaks (blocks)
  const blocks = cleanContent.split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    // Skip WEBVTT header or single number cues
    let timeIndex = 0;
    if (lines[0].toUpperCase().startsWith('WEBVTT') || lines[0].startsWith('NOTE')) {
      continue;
    }

    if (/^\d+$/.test(lines[0]) && lines.length > 1 && lines[1].includes('-->')) {
      timeIndex = 1;
    } else if (!lines[0].includes('-->') && lines.length > 1 && lines[1].includes('-->')) {
      timeIndex = 1;
    }

    const timeLine = lines[timeIndex];
    if (!timeLine || !timeLine.includes('-->')) continue;

    const parts = timeLine.split('-->').map((s) => s.trim());
    if (parts.length < 2) continue;

    const startSeconds = parseTimestampToSeconds(parts[0]);
    // Strip trailing style metadata if present in VTT (e.g. "00:01:23.000 align:start position:10%")
    const rawEnd = parts[1].split(' ')[0];
    const endSeconds = parseTimestampToSeconds(rawEnd);

    if (isNaN(startSeconds) || isNaN(endSeconds)) continue;

    const textLines = lines.slice(timeIndex + 1);
    const rawText = textLines.join('\n')
      .replace(/<[^>]*>?/gm, '') // Strip HTML/VTT tags
      .replace(/\{[^}]*\}?/gm, '') // Strip ASS tags
      .trim();

    if (rawText) {
      cues.push({
        start: startSeconds,
        end: endSeconds,
        text: rawText,
      });
    }
  }

  return cues.sort((a, b) => a.start - b.start);
}

function parseTimestampToSeconds(timestamp) {
  if (!timestamp) return 0;
  // Handle formats: HH:MM:SS,mmm or HH:MM:SS.mmm or MM:SS.mmm
  const cleaned = timestamp.replace(',', '.').trim();
  const parts = cleaned.split(':');

  if (parts.length === 3) {
    const hours = parseFloat(parts[0]) || 0;
    const minutes = parseFloat(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    const minutes = parseFloat(parts[0]) || 0;
    const seconds = parseFloat(parts[1]) || 0;
    return minutes * 60 + seconds;
  }
  return parseFloat(cleaned) || 0;
}

export function formatTimeCode(totalSeconds) {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

