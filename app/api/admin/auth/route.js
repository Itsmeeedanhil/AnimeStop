import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ADMIN_PASSWORDS = ['@WApsjeus159357', 'animestop_admin_2026', process.env.ADMIN_SECRET_KEY].filter(Boolean);

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const username = (body.username || '').toLowerCase().trim();
    const password = body.password || body.passcode || '';

    const isPasswordValid = ADMIN_PASSWORDS.some((p) => p.trim() === password.trim());
    const isUsernameValid = !body.username || username === 'admin' || username === 'admin@animestop.com';

    if (!isPasswordValid || !isUsernameValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin username or password' },
        { status: 401 }
      );
    }

    const adminUser = {
      id: 1,
      name: 'Administrator',
      email: 'admin@animestop.com',
      role: 'admin',
    };

    return NextResponse.json({
      success: true,
      token: '@WApsjeus159357',
      user: adminUser,
      message: 'Admin authentication successful',
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: 'Authentication error' },
      { status: 500 }
    );
  }
}

