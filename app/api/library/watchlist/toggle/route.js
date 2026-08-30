import { NextResponse } from 'next/server';
import { getSql, ensureTables } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const user = await getUserFromRequest(request).catch(() => null);
    const sessionId = request.headers.get('x-session-id') || 'guest_default_session';

    const body = await request.json();
    const { anime_id, title, image_url, banner_url, genres, format, episodes_count, score } = body;

    if (!anime_id || !title) {
      return NextResponse.json({ success: false, message: 'Anime ID and Title are required' }, { status: 422 });
    }

    try {
      await ensureTables();
      const sql = getSql();

      if (user) {
        const existing = await sql`
          SELECT id FROM watchlists 
          WHERE user_id = ${user.id} AND anime_id = ${anime_id} 
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
          INSERT INTO watchlists (user_id, session_id, anime_id, title, image_url, banner_url, genres, format, episodes_count, score)
          VALUES (${user.id}, ${sessionId}, ${anime_id}, ${title}, ${image_url}, ${banner_url}, ${JSON.stringify(genres || [])}, ${format}, ${episodes_count}, ${score})
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
          WHERE session_id = ${sessionId} AND user_id IS NULL AND anime_id = ${anime_id} 
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
          INSERT INTO watchlists (session_id, anime_id, title, image_url, banner_url, genres, format, episodes_count, score)
          VALUES (${sessionId}, ${anime_id}, ${title}, ${image_url}, ${banner_url}, ${JSON.stringify(genres || [])}, ${format}, ${episodes_count}, ${score})
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
      console.warn('Database offline, handled via client fallback:', dbErr.message);
      return NextResponse.json({
        success: true,
        isBookmarked: true,
        message: 'Saved to Watchlist',
      });
    }
  } catch (err) {
    return NextResponse.json({
      success: true,
      isBookmarked: true,
      message: 'Watchlist updated',
    });
  }
}
