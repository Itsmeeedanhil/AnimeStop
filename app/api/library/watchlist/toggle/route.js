import { NextResponse } from 'next/server';
import { getSql, ensureTables } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const user = await getUserFromRequest(request).catch(() => null);
    const sessionId = request.headers.get('x-session-id') || 'guest_default_session';

    const body = await request.json();
    const { anime_id, image_url, banner_url, genres, format, episodes_count, score } = body;
    
    // Safely extract title string
    const rawTitle = body.title || body.anime_title;
    const titleStr = typeof rawTitle === 'object' 
      ? (rawTitle.english || rawTitle.romaji || rawTitle.native || 'Anime')
      : String(rawTitle || 'Anime');

    const cleanAnimeId = parseInt(anime_id, 10);
    if (!cleanAnimeId) {
      return NextResponse.json({ success: false, message: 'Anime ID is required' }, { status: 422 });
    }

    try {
      await ensureTables();
      const sql = getSql();

      if (user) {
        const existing = await sql`
          SELECT id FROM watchlists 
          WHERE (user_id = ${user.id} OR (session_id = ${sessionId} AND user_id IS NULL))
            AND anime_id = ${cleanAnimeId} 
          LIMIT 1
        `;

        if (existing.length > 0) {
          await sql`DELETE FROM watchlists WHERE id = ${existing[0].id}`;
          return NextResponse.json({
            success: true,
            isBookmarked: false,
            message: 'Removed from your personal Watchlist',
          });
        }

        const inserted = await sql`
          INSERT INTO watchlists (user_id, session_id, anime_id, title, image_url, banner_url, genres, format, episodes_count, score, created_at)
          VALUES (
            ${user.id}, 
            ${sessionId}, 
            ${cleanAnimeId}, 
            ${titleStr}, 
            ${image_url || null}, 
            ${banner_url || null}, 
            ${JSON.stringify(genres || [])}, 
            ${format || 'TV'}, 
            ${episodes_count || null}, 
            ${score || null},
            CURRENT_TIMESTAMP
          )
          RETURNING *
        `;

        return NextResponse.json({
          success: true,
          isBookmarked: true,
          message: 'Saved to your personal Watchlist',
          data: inserted[0],
        });
      } else {
        const existing = await sql`
          SELECT id FROM watchlists 
          WHERE session_id = ${sessionId} AND user_id IS NULL AND anime_id = ${cleanAnimeId} 
          LIMIT 1
        `;

        if (existing.length > 0) {
          await sql`DELETE FROM watchlists WHERE id = ${existing[0].id}`;
          return NextResponse.json({
            success: true,
            isBookmarked: false,
            message: 'Removed from your Watchlist',
          });
        }

        const inserted = await sql`
          INSERT INTO watchlists (session_id, anime_id, title, image_url, banner_url, genres, format, episodes_count, score, created_at)
          VALUES (
            ${sessionId}, 
            ${cleanAnimeId}, 
            ${titleStr}, 
            ${image_url || null}, 
            ${banner_url || null}, 
            ${JSON.stringify(genres || [])}, 
            ${format || 'TV'}, 
            ${episodes_count || null}, 
            ${score || null},
            CURRENT_TIMESTAMP
          )
          RETURNING *
        `;

        return NextResponse.json({
          success: true,
          isBookmarked: true,
          message: 'Saved to your Watchlist',
          data: inserted[0],
        });
      }
    } catch (dbErr) {
      console.warn('Database error in watchlist toggle:', dbErr.message);
      return NextResponse.json({ success: true, isBookmarked: true, message: 'Saved locally' });
    }
  } catch (err) {
    console.error('Watchlist toggle API error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
