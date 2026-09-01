import { NextResponse } from 'next/server';
import { sql, ensureTables } from '@/lib/db';

export const dynamic = 'force-dynamic';

const verifyAdmin = (req) => {
  const masterKey = (process.env.ADMIN_SECRET_KEY || 'animestop_admin_2026').trim();
  const authHeader = req.headers.get('x-admin-key') || req.headers.get('authorization')?.replace('Bearer ', '');
  return authHeader && authHeader.trim() === masterKey;
};

// GET: Fetch all announcements for admin (active and inactive)
export async function GET(req) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureTables();
    const rows = await sql`
      SELECT id, title, message, type, badge, link_url, link_text, is_active, is_dismissible, created_at, updated_at
      FROM announcements
      ORDER BY id DESC
    `;

    return NextResponse.json({
      success: true,
      data: rows || [],
    });
  } catch (err) {
    console.error('Admin GET announcements error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Create a new announcement
export async function POST(req) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      title,
      message,
      type = 'info',
      badge = 'ANNOUNCEMENT',
      link_url = '',
      link_text = '',
      is_active = true,
      is_dismissible = true,
    } = body;

    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: 'Title and message are required' },
        { status: 400 }
      );
    }

    await ensureTables();
    const result = await sql`
      INSERT INTO announcements (
        title,
        message,
        type,
        badge,
        link_url,
        link_text,
        is_active,
        is_dismissible,
        created_at,
        updated_at
      ) VALUES (
        ${title.trim()},
        ${message.trim()},
        ${type},
        ${badge.trim() || 'ANNOUNCEMENT'},
        ${link_url ? link_url.trim() : null},
        ${link_text ? link_text.trim() : null},
        ${is_active},
        ${is_dismissible},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Announcement published successfully',
    });
  } catch (err) {
    console.error('Admin POST announcement error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH: Toggle active or edit announcement
export async function PATCH(req) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, is_active } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Announcement ID is required' }, { status: 400 });
    }

    await ensureTables();
    const result = await sql`
      UPDATE announcements
      SET is_active = ${is_active}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Announcement updated successfully',
    });
  } catch (err) {
    console.error('Admin PATCH announcement error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: Remove announcement
export async function DELETE(req) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Announcement ID is required' }, { status: 400 });
    }

    await ensureTables();
    await sql`
      DELETE FROM announcements
      WHERE id = ${id}
    `;

    return NextResponse.json({
      success: true,
      message: 'Announcement deleted successfully',
    });
  } catch (err) {
    console.error('Admin DELETE announcement error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

