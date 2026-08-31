import { NextResponse } from 'next/server';
import { getSql, ensureTables } from '@/lib/db';
import { generateToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function stringToId(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash) || Math.floor(Math.random() * 100000) + 1;
}

export async function POST(request) {
  try {
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
      return NextResponse.json(
        { success: false, message: 'Google authentication did not return a valid email address.' },
        { status: 422 }
      );
    }

    const cleanEmail = userEmail.toLowerCase().trim();
    const cleanName = userName || cleanEmail.split('@')[0] || 'Anime Fan';
    let user = {
      id: stringToId(cleanEmail),
      name: cleanName,
      email: cleanEmail,
      avatar_url: userAvatar || null,
      google_id: googleId || null,
    };

    // Try persisting to PostgreSQL database if available
    try {
      await ensureTables();
      const sql = getSql();

      const existing = await sql`
        SELECT id, name, email, avatar_url, google_id, created_at
        FROM users
        WHERE email = ${cleanEmail} OR (google_id IS NOT NULL AND google_id = ${googleId || null})
        LIMIT 1
      `;

      if (existing.length > 0) {
        user = existing[0];
        await sql`
          UPDATE users
          SET google_id = COALESCE(google_id, ${googleId || null}),
              avatar_url = COALESCE(avatar_url, ${userAvatar || null}),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${user.id}
        `.catch(() => {});
      } else {
        const inserted = await sql`
          INSERT INTO users (name, email, google_id, avatar_url)
          VALUES (${cleanName}, ${cleanEmail}, ${googleId || null}, ${userAvatar || null})
          RETURNING id, name, email, avatar_url, created_at
        `;
        if (inserted.length > 0) {
          user = inserted[0];
        }
      }

      // Merge guest library into user account
      if (session_id) {
        await sql`
          UPDATE watchlists SET user_id = ${user.id} WHERE session_id = ${session_id} AND user_id IS NULL
        `.catch(() => {});
        await sql`
          UPDATE watch_histories SET user_id = ${user.id} WHERE session_id = ${session_id} AND user_id IS NULL
        `.catch(() => {});
      }
    } catch (dbErr) {
      console.warn('PostgreSQL database temporarily unavailable during Google login; using secure token fallback:', dbErr.message);
    }

    const token = generateToken(user);

    return NextResponse.json({
      success: true,
      message: `Signed in with Google as ${user.name}!`,
      token,
      user,
    });
  } catch (err) {
    console.error('Google Auth API error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Google authentication encountered an unexpected error.' },
      { status: 500 }
    );
  }
}
