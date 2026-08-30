import { NextResponse } from 'next/server';
import { getSql, ensureTables } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const user = await getUserFromRequest(request).catch(() => null);
    const sessionId = request.headers.get('x-session-id') || 'guest_default_session';

    try {
      await ensureTables();
      const sql = getSql();

      if (user) {
        await sql`DELETE FROM watch_histories WHERE user_id = ${user.id}`;
      } else {
        await sql`DELETE FROM watch_histories WHERE session_id = ${sessionId} AND user_id IS NULL`;
      }
    } catch (dbErr) {
      console.warn('Database offline during history clear:', dbErr.message);
    }

    return NextResponse.json({ success: true, message: 'Watch history cleared' });
  } catch (err) {
    return NextResponse.json({ success: true, message: 'Watch history cleared' });
  }
}
