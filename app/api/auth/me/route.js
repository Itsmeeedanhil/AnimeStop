import { NextResponse } from 'next/server';
import { getUserFromRequest, verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthenticated' }, { status: 401 });
    }

    let user = null;
    try {
      user = await getUserFromRequest(request);
    } catch (e) {}

    // Fallback: decode directly from signed JWT if database was unreachable
    if (!user) {
      const decoded = verifyToken(token);
      if (decoded?.email) {
        user = {
          id: decoded.id,
          name: decoded.name,
          email: decoded.email,
        };
      }
    }

    if (!user) {
      return NextResponse.json({ success: false, message: 'Invalid or expired token' }, { status: 401 });
    }

    return NextResponse.json({ success: true, user });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ success: true, message: 'Logged out successfully' });
}
