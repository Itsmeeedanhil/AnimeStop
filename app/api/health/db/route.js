import { NextResponse } from 'next/server';
import { getSql, ensureTables } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    env: {
      hasPostgresUrl: Boolean(process.env.POSTGRES_URL),
      hasPostgresPrismaUrl: Boolean(process.env.POSTGRES_PRISMA_URL),
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasDbHost: Boolean(process.env.DB_HOST),
      hasDbUser: Boolean(process.env.DB_USERNAME || process.env.POSTGRES_USER),
    },
    connected: false,
    tables: {},
    error: null,
  };

  try {
    await ensureTables();
    const sql = getSql();

    const users = await sql`SELECT count(*) as count FROM users`;
    const watchlists = await sql`SELECT count(*) as count FROM watchlists`;
    const history = await sql`SELECT count(*) as count FROM watch_histories`;

    diagnostics.connected = true;
    diagnostics.tables = {
      usersCount: users[0]?.count || 0,
      watchlistsCount: watchlists[0]?.count || 0,
      historyCount: history[0]?.count || 0,
    };

    return NextResponse.json({ success: true, diagnostics });
  } catch (err) {
    diagnostics.error = {
      message: err.message,
      code: err.code,
      stack: err.stack,
    };
    return NextResponse.json({ success: false, diagnostics }, { status: 500 });
  }
}

