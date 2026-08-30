import { NextResponse } from 'next/server';
import { getSql, ensureTables } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const user = await getUserFromRequest(request).catch(() => null);
    const sessionId = request.headers.get('x-session-id') || 'guest_default_session';

    const body = await request.json();
    const { anime_id, anime_title, anime_image, anime_banner, episode_number, progress_seconds, duration_seconds, completed } = body;

    if (!anime_id || !anime_title) {
      return NextResponse.json({ success: false, message: 'Anime ID and Title required' }, { status: 422 });
    }

    const epNum = parseInt(episode_number || '1', 10);
    const progSec = parseInt(progress_seconds || '0', 10);
    const durSec = parseInt(duration_seconds || '0', 10);
    const isCompleted = Boolean(completed);

    try {
      await ensureTables();
      const sql = getSql();

      if (user) {
        const existing = await sql`
          SELECT id FROM watch_histories 
          WHERE user_id = ${user.id} AND anime_id = ${anime_id} AND episode_number = ${epNum}
          LIMIT 1
        `;

        let record;
        if (existing.length > 0) {
          const updated = await sql`
            UPDATE watch_histories
            SET progress_seconds = ${progSec},
                duration_seconds = ${durSec},
                completed = ${isCompleted},
                last_watched_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${existing[0].id}
            RETURNING *
          `;
          record = updated[0];
        } else {
          const inserted = await sql`
            INSERT INTO watch_histories (user_id, session_id, anime_id, anime_title, anime_image, anime_banner, episode_number, progress_seconds, duration_seconds, completed)
            VALUES (${user.id}, ${sessionId}, ${anime_id}, ${anime_title}, ${anime_image}, ${anime_banner}, ${epNum}, ${progSec}, ${durSec}, ${isCompleted})
            RETURNING *
          `;
          record = inserted[0];
        }

        return NextResponse.json({ success: true, data: record });
      } else {
        const existing = await sql`
          SELECT id FROM watch_histories 
          WHERE session_id = ${sessionId} AND user_id IS NULL AND anime_id = ${anime_id} AND episode_number = ${epNum}
          LIMIT 1
        `;

        let record;
        if (existing.length > 0) {
          const updated = await sql`
            UPDATE watch_histories
            SET progress_seconds = ${progSec},
                duration_seconds = ${durSec},
                completed = ${isCompleted},
                last_watched_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${existing[0].id}
            RETURNING *
          `;
          record = updated[0];
        } else {
          const inserted = await sql`
            INSERT INTO watch_histories (session_id, anime_id, anime_title, anime_image, anime_banner, episode_number, progress_seconds, duration_seconds, completed)
            VALUES (${sessionId}, ${anime_id}, ${anime_title}, ${anime_image}, ${anime_banner}, ${epNum}, ${progSec}, ${durSec}, ${isCompleted})
            RETURNING *
          `;
          record = inserted[0];
        }

        return NextResponse.json({ success: true, data: record });
      }
    } catch (dbErr) {
      return NextResponse.json({
        success: true,
        data: {
          anime_id,
          episode_number: epNum,
          progress_seconds: progSec,
          duration_seconds: durSec,
        },
      });
    }
  } catch (err) {
    return NextResponse.json({ success: true });
  }
}
