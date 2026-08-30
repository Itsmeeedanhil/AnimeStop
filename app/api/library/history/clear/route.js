import { NextResponse } from 'next/server';
import { getSql, ensureTables } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request) {
  try {
    await ensureTables();
    const user = await getUserFromRequest(request);
    const sessionId = request.headers.get('x-session-id') || 'guest_default_session';

    const sql = getSql();

    if (user) {
      await sql`DELETE FROM watch_histories WHERE user_id = ${user.id}`;
    } else {
      await sql`DELETE FROM watch_histories WHERE session_id = ${sessionId} AND user_id IS NULL`;
    }

    return NextResponse.json({ success: true, message: 'Watch history cleared' });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

