import { NextResponse } from 'next/server';
import { getSql, ensureTables } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function DELETE(request, { params }) {
  try {
    await ensureTables();
    const user = await getUserFromRequest(request);
    const sessionId = request.headers.get('x-session-id') || 'guest_default_session';
    const id = parseInt(params.id, 10);

    const sql = getSql();

    if (user) {
      await sql`DELETE FROM watch_histories WHERE id = ${id} AND user_id = ${user.id}`;
    } else {
      await sql`DELETE FROM watch_histories WHERE id = ${id} AND session_id = ${sessionId} AND user_id IS NULL`;
    }

    return NextResponse.json({ success: true, message: 'History item removed' });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

