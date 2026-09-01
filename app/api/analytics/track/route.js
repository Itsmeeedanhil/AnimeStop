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

      // Record historical visit
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

      // Record / update real-time live session in Supabase
      if (!isBotDetected) {
        await sql`
          INSERT INTO live_sessions (
            session_id,
            user_id,
            user_email,
            user_name,
            current_path,
            page_title,
            referrer,
            device_type,
            browser,
            ip_address,
            country,
            is_active,
            last_heartbeat_at
          ) VALUES (
            ${sessionId},
            ${user?.id || null},
            ${user?.email || null},
            ${user?.name || null},
            ${path},
            ${body?.title || path},
            ${referrer},
            ${deviceType},
            ${userAgent.substring(0, 99)},
            ${ip},
            ${country},
            TRUE,
            CURRENT_TIMESTAMP
          )
          ON CONFLICT (session_id) DO UPDATE SET
            user_id = COALESCE(EXCLUDED.user_id, live_sessions.user_id),
            user_email = COALESCE(EXCLUDED.user_email, live_sessions.user_email),
            user_name = COALESCE(EXCLUDED.user_name, live_sessions.user_name),
            current_path = EXCLUDED.current_path,
            page_title = EXCLUDED.page_title,
            referrer = EXCLUDED.referrer,
            device_type = EXCLUDED.device_type,
            ip_address = EXCLUDED.ip_address,
            country = EXCLUDED.country,
            is_active = TRUE,
            last_heartbeat_at = CURRENT_TIMESTAMP
        `;
      }
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
