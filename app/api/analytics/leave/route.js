import { NextResponse } from 'next/server';
import { getSql, ensureTables } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    let sessionId = req.headers.get('x-session-id');
    if (!sessionId) {
      const body = await req.json().catch(() => ({}));
      sessionId = body?.session_id;
    }

    if (sessionId) {
      await ensureTables();
      const sql = getSql();
      await sql`
        DELETE FROM live_sessions 
        WHERE session_id = ${sessionId}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
