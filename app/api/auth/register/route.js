import { NextResponse } from 'next/server';
import { getSql, ensureTables } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';

export async function POST(request) {
  try {
    await ensureTables();
    const body = await request.json();
    const { name, email, password, session_id } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, message: 'Name, email, and password are required' }, { status: 422 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, message: 'Password must be at least 6 characters' }, { status: 422 });
    }

    const sql = getSql();

    // Check if user already exists
    const existing = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase().trim()} LIMIT 1
    `;

    if (existing.length > 0) {
      return NextResponse.json({ success: false, message: 'The email has already been taken.' }, { status: 422 });
    }

    const hashedPassword = await hashPassword(password);

    const inserted = await sql`
      INSERT INTO users (name, email, password)
      VALUES (${name.trim()}, ${email.toLowerCase().trim()}, ${hashedPassword})
      RETURNING id, name, email, avatar_url, created_at
    `;

    const user = inserted[0];
    const token = generateToken(user);

    // Merge guest watchlist into new user account if session_id provided
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
      message: 'Account created successfully',
      token,
      user,
    }, { status: 201 });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

