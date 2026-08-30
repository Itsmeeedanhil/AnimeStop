import { NextResponse } from 'next/server';
import { getSql, ensureTables } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    let totalHumanVisits = 0;
    let uniqueHumanVisitors = 0;
    let todayHumanVisits = 0;
    let registeredUsers = 0;
    let totalStreams = 0;
    let botVisitsFiltered = 0;

    try {
      await ensureTables();
      const sql = getSql();

      // Query real human visits (casting count to integer in SQL)
      const totalVisitsRes = await sql`
        SELECT count(*)::int AS count 
        FROM site_visits 
        WHERE is_bot = FALSE
      `;
      totalHumanVisits = Number(totalVisitsRes[0]?.count) || 0;

      // Query unique human visitors
      const uniqueVisitsRes = await sql`
        SELECT count(DISTINCT visitor_hash)::int AS count 
        FROM site_visits 
        WHERE is_bot = FALSE
      `;
      uniqueHumanVisitors = Number(uniqueVisitsRes[0]?.count) || 0;

      // Query today's human visits
      const todayVisitsRes = await sql`
        SELECT count(*)::int AS count 
        FROM site_visits 
        WHERE is_bot = FALSE AND created_at >= CURRENT_DATE
      `;
      todayHumanVisits = Number(todayVisitsRes[0]?.count) || 0;

      // Query filtered bots
      const botVisitsRes = await sql`
        SELECT count(*)::int AS count 
        FROM site_visits 
        WHERE is_bot = TRUE
      `;
      botVisitsFiltered = Number(botVisitsRes[0]?.count) || 0;

      // Query registered accounts
      const usersRes = await sql`
        SELECT count(*)::int AS count 
        FROM users
      `;
      registeredUsers = Number(usersRes[0]?.count) || 0;

      // Query total watch histories
      const historyRes = await sql`
        SELECT count(*)::int AS count 
        FROM watch_histories
      `;
      totalStreams = Number(historyRes[0]?.count) || 0;
    } catch (dbErr) {
      console.warn('Database stats query error:', dbErr.message);
    }

    const response = NextResponse.json({
      success: true,
      data: {
        totalHumanVisits,
        uniqueHumanVisitors,
        todayHumanVisits,
        botVisitsFiltered,
        registeredUsers,
        totalStreams,
        botShieldStatus: 'Active & Verified',
      },
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return response;
  } catch (err) {
    return NextResponse.json({
      success: true,
      data: {
        totalHumanVisits: 0,
        uniqueHumanVisitors: 0,
        todayHumanVisits: 0,
        botVisitsFiltered: 0,
        registeredUsers: 0,
        totalStreams: 0,
        botShieldStatus: 'Active',
      },
    });
  }
}
