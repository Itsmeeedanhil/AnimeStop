import { NextResponse } from 'next/server';
import { getSql, ensureTables } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { isBot, generateVisitorHash, detectDevice } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const userAgent = request.headers.get('user-agent') || '';
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || '127.0.0.1';
    const country = request.headers.get('x-vercel-ip-country') || request.headers.get('cf-ipcountry') || 'Unknown';
    const sessionId = request.headers.get('x-session-id') || 'session_guest';

    const body = await request.json().catch(() => ({}));
    const path = body?.path || '/';
    const referrer = body?.referrer || request.headers.get('referer') || '';
    const clientSignals = body?.clientSignals || {};

    // 1. Rigorous Bot Filtering
    const isBotDetected = isBot(userAgent, clientSignals);

    const visitorHash = generateVisitorHash(ip, userAgent);
    const deviceType = detectDevice(userAgent);

    const user = await getUserFromRequest(request).catch(() => null);

    // 2. Persist to Neon PostgreSQL if database is online
    try {
      await ensureTables();
      const sql = getSql();

      await sql`
        INSERT INTO site_visits (
          user_id,
          session_id,
          visitor_hash,
          path,
          referrer,
          user_agent,
          country,
          device_type,
          is_bot
        ) VALUES (
          ${user?.id || null},
          ${sessionId},
          ${visitorHash},
          ${path},
          ${referrer},
          ${userAgent},
          ${country},
          ${deviceType},
          ${isBotDetected}
        )
      `;
    } catch (dbErr) {
      console.warn('Database offline during analytics tracking:', dbErr.message);
    }

    return NextResponse.json({
      success: true,
      filtered: isBotDetected,
      human: !isBotDetected,
      device: deviceType,
    });
  } catch (err) {
    return NextResponse.json({ success: true });
  }
}
