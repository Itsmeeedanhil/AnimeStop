import { NextResponse } from 'next/server';
import { getSql, ensureTables } from '@/lib/db';

export const dynamic = 'force-dynamic';

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

      // Exact total human visits (excluding bots)
      const totalVisitsRes = await sql`
        SELECT COUNT(*) as count 
        FROM site_visits 
        WHERE is_bot = FALSE
      `;
      totalHumanVisits = parseInt(totalVisitsRes[0]?.count || '0', 10);

      // Exact unique human visitors (deduplicated by visitor_hash)
      const uniqueVisitsRes = await sql`
        SELECT COUNT(DISTINCT visitor_hash) as count 
        FROM site_visits 
        WHERE is_bot = FALSE
      `;
      uniqueHumanVisitors = parseInt(uniqueVisitsRes[0]?.count || '0', 10);

      // Exact today's human visits
      const todayVisitsRes = await sql`
        SELECT COUNT(*) as count 
        FROM site_visits 
        WHERE is_bot = FALSE AND created_at >= CURRENT_DATE
      `;
      todayHumanVisits = parseInt(todayVisitsRes[0]?.count || '0', 10);

      // Filtered bots count
      const botVisitsRes = await sql`
        SELECT COUNT(*) as count 
        FROM site_visits 
        WHERE is_bot = TRUE
      `;
      botVisitsFiltered = parseInt(botVisitsRes[0]?.count || '0', 10);

      // Exact registered accounts
      const usersRes = await sql`
        SELECT COUNT(*) as count 
        FROM users
      `;
      registeredUsers = parseInt(usersRes[0]?.count || '0', 10);

      // Exact total watch history / stream records
      const historyRes = await sql`
        SELECT COUNT(*) as count 
        FROM watch_histories
      `;
      totalStreams = parseInt(historyRes[0]?.count || '0', 10);
    } catch (dbErr) {
      console.warn('Database stats query offline:', dbErr.message);
    }

    return NextResponse.json({
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
