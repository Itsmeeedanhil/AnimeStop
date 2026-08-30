import { NextResponse } from 'next/server';
import { getSql, ensureTables } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    await ensureTables();
    const user = await getUserFromRequest(request);
    const sessionId = request.headers.get('x-session-id') || 'guest_default_session';

    const sql = getSql();
    let watchlist;
    let history;

    if (user) {
      watchlist = await sql`
        SELECT * FROM watchlists 
        WHERE user_id = ${user.id} 
        ORDER BY created_at DESC
      `;
      history = await sql`
        SELECT * FROM watch_histories 
        WHERE user_id = ${user.id} 
        ORDER BY last_watched_at DESC 
        LIMIT 30
      `;
    } else {
      watchlist = await sql`
        SELECT * FROM watchlists 
        WHERE session_id = ${sessionId} AND user_id IS NULL 
        ORDER BY created_at DESC
      `;
      history = await sql`
        SELECT * FROM watch_histories 
        WHERE session_id = ${sessionId} AND user_id IS NULL 
        ORDER BY last_watched_at DESC 
        LIMIT 30
      `;
    }

    const continueWatching = history.filter(item => !item.completed);

    return NextResponse.json({
      success: true,
      data: {
        watchlist,
        continueWatching,
        history,
        user: user ? { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url } : null,
      },
    });
  } catch (err) {
    console.error('Library API error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

