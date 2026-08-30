import { NextResponse } from 'next/server';
import { getSql, ensureTables } from '@/lib/db';
import { generateToken } from '@/lib/auth';

export async function POST(request) {
  try {
    await ensureTables();
    const body = await request.json();
    const { credential, email, name, picture, google_id, session_id } = body;

    let userEmail = email;
    let userName = name;
    let userAvatar = picture;
    let googleId = google_id;

    // If a Google JWT ID token was passed, decode it
    if (credential && !userEmail) {
      try {
        const parts = credential.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          userEmail = payload.email;
          userName = payload.name || payload.given_name;
          userAvatar = payload.picture;
          googleId = payload.sub;
        }
      } catch (e) {
        console.error('Failed to decode Google JWT token:', e);
      }
    }

    if (!userEmail) {
      return NextResponse.json({ success: false, message: 'Google authentication did not return a valid email address.' }, { status: 422 });
    }

    const sql = getSql();

    // Check if user exists by email or google_id
    const existing = await sql`
      SELECT id, name, email, avatar_url, google_id, created_at
      FROM users
      WHERE email = ${userEmail.toLowerCase().trim()} OR (google_id IS NOT NULL AND google_id = ${googleId || ''})
      LIMIT 1
    `;

    let user;

    if (existing.length > 0) {
      user = existing[0];
      // Update avatar or google_id if missing
      await sql`
        UPDATE users
        SET google_id = COALESCE(google_id, ${googleId}),
            avatar_url = COALESCE(avatar_url, ${userAvatar}),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${user.id}
      `;
    } else {
      const inserted = await sql`
        INSERT INTO users (name, email, google_id, avatar_url)
        VALUES (${userName || 'Anime Fan'}, ${userEmail.toLowerCase().trim()}, ${googleId}, ${userAvatar})
        RETURNING id, name, email, avatar_url, created_at
      `;
      user = inserted[0];
    }

    const token = generateToken(user);

    // Merge guest library
    if (session_id) {
      await sql`
        UPDATE watchlists SET user_id = ${user.id} WHERE session_id = ${session_id} AND user_id IS NULL
      `;
      await sql`
        UPDATE watch_histories SET user_id = ${user.id} WHERE session_id = ${session_id} AND user_id IS NULL
      `;
    }

    return NextResponse.json({
      success: true,
      message: `Signed in with Google as ${user.name}!`,
      token,
      user,
    });
  } catch (err) {
    console.error('Google Auth API error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

