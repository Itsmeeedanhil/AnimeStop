import { NextResponse } from 'next/server';
import { getSql, ensureTables } from '@/lib/db';

export const dynamic = 'force-dynamic';

const ADMIN_PASSWORDS = ['@WApsjeus159357', 'animestop_admin_2026', process.env.ADMIN_SECRET_KEY].filter(Boolean);

export async function GET(request) {
  try {
    const adminKey = request.headers.get('x-admin-key') || request.headers.get('authorization')?.replace('Bearer ', '');
    const isAuthorized = adminKey && ADMIN_PASSWORDS.some((p) => p.trim() === adminKey.trim());
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureTables();
    const sql = getSql();

    // 1. Purge stale sessions older than 45 seconds immediately from Supabase
    try {
      await sql`
        DELETE FROM live_sessions 
        WHERE last_heartbeat_at < NOW() - INTERVAL '45 seconds'
      `;
    } catch (e) {}

    // 2. Fetch truly active live sessions within the last 45 seconds
    const liveSessions = await sql`
      SELECT 
        session_id,
        user_id,
        user_email,
        user_name,
        current_path,
        page_title,
        device_type,
        country,
        ip_address,
        last_heartbeat_at,
        created_at,
        ROUND(EXTRACT(EPOCH FROM (NOW() - last_heartbeat_at))) as seconds_ago
      FROM live_sessions
      WHERE last_heartbeat_at >= NOW() - INTERVAL '45 seconds'
      ORDER BY last_heartbeat_at DESC
      LIMIT 100
    `;

    // 2. Aggregate stats
    const totalLive = liveSessions.length;
    const desktopAppCount = liveSessions.filter(s => s.device_type?.toLowerCase().includes('windows') || s.device_type?.toLowerCase().includes('desktop')).length;
    const webCount = Math.max(0, totalLive - desktopAppCount);

    // 3. Fetch recent access history (last 30 visits)
    const recentAccess = await sql`
      SELECT 
        sv.id,
        sv.path,
        sv.device_type,
        sv.country,
        sv.created_at,
        ROUND(EXTRACT(EPOCH FROM (NOW() - sv.created_at))) as seconds_ago,
        u.name as user_name,
        u.email as user_email
      FROM site_visits sv
      LEFT JOIN users u ON sv.user_id = u.id
      WHERE sv.is_bot = FALSE
      ORDER BY sv.created_at DESC
      LIMIT 30
    `;

    return NextResponse.json({
      success: true,
      data: {
        total_live: totalLive,
        desktop_app_live: desktopAppCount,
        web_live: webCount,
        sessions: liveSessions,
        recent_access: recentAccess,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Error fetching real-time analytics:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

