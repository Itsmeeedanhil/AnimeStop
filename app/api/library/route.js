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
        // Auto-merge any guest session records into this user's account
        if (sessionId && sessionId !== 'guest_default_session') {
          await sql`
            UPDATE watchlists 
            SET user_id = ${user.id} 
            WHERE session_id = ${sessionId} AND user_id IS NULL
          `.catch(() => {});
          await sql`
            UPDATE watch_histories 
            SET user_id = ${user.id} 
            WHERE session_id = ${sessionId} AND user_id IS NULL
          `.catch(() => {});
        }

        watchlist = await sql`
          SELECT DISTINCT ON (anime_id) * FROM watchlists 
          WHERE user_id = ${user.id} 
          ORDER BY anime_id, created_at DESC
        `;
        // Sort by created_at DESC
        watchlist.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        history = await sql`
          SELECT DISTINCT ON (anime_id, episode_number) * FROM watch_histories 
          WHERE user_id = ${user.id} 
          ORDER BY anime_id, episode_number, last_watched_at DESC
        `;
        // Sort by last_watched_at DESC
        history.sort((a, b) => new Date(b.last_watched_at || b.created_at) - new Date(a.last_watched_at || a.created_at));
      } else {
        watchlist = await sql`
          SELECT DISTINCT ON (anime_id) * FROM watchlists 
          WHERE session_id = ${sessionId} AND user_id IS NULL 
          ORDER BY anime_id, created_at DESC
        `;
        watchlist.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        history = await sql`
          SELECT DISTINCT ON (anime_id, episode_number) * FROM watch_histories 
          WHERE session_id = ${sessionId} AND user_id IS NULL 
          ORDER BY anime_id, episode_number, last_watched_at DESC
        `;
        history.sort((a, b) => new Date(b.last_watched_at || b.created_at) - new Date(a.last_watched_at || a.created_at));
      }
    } catch (dbErr) {
      console.warn('Database not available for library, returning safe fallback:', dbErr.message);
    }

    const continueWatching = Array.isArray(history) ? history.filter((item) => !item.completed) : [];

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
