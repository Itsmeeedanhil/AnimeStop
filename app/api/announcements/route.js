import { NextResponse } from 'next/server';
import { sql, ensureTables } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureTables();
    const rows = await sql`
      SELECT id, title, message, type, badge, link_url, link_text, is_dismissible, created_at, updated_at
      FROM announcements
      WHERE is_active = TRUE
      ORDER BY id DESC
      LIMIT 5
    `;

    return NextResponse.json({
      success: true,
      data: rows || [],
    });
  } catch (err) {
    console.error('Error fetching public announcements:', err);
    return NextResponse.json({
      success: false,
      data: [],
      error: 'Failed to retrieve announcements',
    });
  }
}

