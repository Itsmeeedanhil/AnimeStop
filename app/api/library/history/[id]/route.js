import { NextResponse } from 'next/server';
import { getSql, ensureTables } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(request, { params }) {
  try {
    const user = await getUserFromRequest(request).catch(() => null);
    const sessionId = request.headers.get('x-session-id') || 'guest_default_session';
    const id = parseInt(params.id, 10);

    try {
      await ensureTables();
      const sql = getSql();

      if (user) {
        await sql`DELETE FROM watch_histories WHERE id = ${id} AND user_id = ${user.id}`;
      } else {
        await sql`DELETE FROM watch_histories WHERE id = ${id} AND session_id = ${sessionId} AND user_id IS NULL`;
      }
    } catch (dbErr) {
      console.warn('Database offline during history delete:', dbErr.message);
    }

    return NextResponse.json({ success: true, message: 'History item removed' });
  } catch (err) {
    return NextResponse.json({ success: true, message: 'Removed' });
  }
}
