import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const getAdminMasterKey = () => {
  return process.env.ADMIN_SECRET_KEY || 'animestop_admin_2026';
};

export async function POST(req) {
  try {
    const { passcode } = await req.json();
    const masterKey = getAdminMasterKey();

    if (!passcode || passcode.trim() !== masterKey.trim()) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin passcode' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      token: masterKey,
      message: 'Admin authentication successful',
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: 'Authentication error' },
      { status: 500 }
    );
  }
}

