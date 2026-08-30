import { NextResponse } from 'next/server';
import { getSql, ensureTables } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const user = await getUserFromRequest(request).catch(() => null);
    const sessionId = request.headers.get('x-session-id') || 'guest_default_session';

    let watchlist = [];
    let history = [];

    try {
      await ensureTables();
      const sql = getSql();

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
    } catch (dbErr) {
      console.warn('Database not available for library, returning safe fallback:', dbErr.message);
    }

    const continueWatching = Array.isArray(history) ? history.filter(item => !item.completed) : [];

    return NextResponse.json({
      success: true,
      data: {
        watchlist: watchlist || [],
        continueWatching: continueWatching || [],
        history: history || [],
        user: user ? { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url } : null,
      },
    });
  } catch (err) {
    return NextResponse.json({
      success: true,
      data: {
        watchlist: [],
        continueWatching: [],
        history: [],
        user: null,
      },
    });
  }
}
