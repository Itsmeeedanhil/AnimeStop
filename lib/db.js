import { Pool } from 'pg';

// Retrieve PostgreSQL / Supabase connection URL dynamically from environment
const getDbUrl = () => {
  // Check official Vercel Supabase integration & standard variables in priority order
  let url =
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    process.env.SUPABASE_POSTGRES_URL;

  // Construct from Vercel POSTGRES_* individual variables if present
  if (!url && process.env.POSTGRES_HOST && process.env.POSTGRES_USER && process.env.POSTGRES_PASSWORD) {
    const user = encodeURIComponent(process.env.POSTGRES_USER);
    const pass = encodeURIComponent(process.env.POSTGRES_PASSWORD);
    const host = process.env.POSTGRES_HOST;
    const port = process.env.POSTGRES_PORT || '6543';
    const db = process.env.POSTGRES_DATABASE || 'postgres';
    url = `postgresql://${user}:${pass}@${host}:${port}/${db}`;
  }

  // Construct from individual DB_* environment variables if present
  if (!url && process.env.DB_HOST && process.env.DB_USERNAME && process.env.DB_PASSWORD) {
    const user = encodeURIComponent(process.env.DB_USERNAME);
    const pass = encodeURIComponent(process.env.DB_PASSWORD);
    const host = process.env.DB_HOST;
    const port = process.env.DB_PORT || '5432';
    const db = process.env.DB_DATABASE || 'postgres';
    url = `postgresql://${user}:${pass}@${host}:${port}/${db}`;
  }

  if (!url) {
    throw new Error('Database connection URL is missing. Please set DATABASE_URL or POSTGRES_URL in your environment.');
  }

  // Dynamically convert ANY Supabase direct connection (db.<ref>.supabase.co)
  // to Supabase's IPv4 Connection Pooler (port 6543) so serverless environments connect reliably
  if (url.includes('.supabase.co')) {
    const match = url.match(/db\.([a-z0-9]+)\.supabase\.co/);
    if (match && match[1]) {
      const projectRef = match[1];
      const region = process.env.SUPABASE_REGION || 'ap-south-1';
      url = url.replace(`db.${projectRef}.supabase.co:5432`, `aws-0-${region}.pooler.supabase.com:6543`);
      url = url.replace(`db.${projectRef}.supabase.co`, `aws-0-${region}.pooler.supabase.com:6543`);
      if (!url.includes(`postgres.${projectRef}:`)) {
        url = url.replace('postgres:', `postgres.${projectRef}:`);
      }
    }
  }

  // Strip all URL query parameters (?sslmode=..., &supa=...) so database name is cleanly parsed
  url = url.split('?')[0];

  return url;
};

let pool = null;
let currentDbUrl = null;

export const getSql = () => {
  const dbUrl = getDbUrl();

  // Reset connection pool if DB URL changed
  if (currentDbUrl !== dbUrl) {
    currentDbUrl = dbUrl;
    if (pool) {
      pool.end().catch(() => {});
      pool = null;
    }
  }

  // Standard PostgreSQL Connection Pool with permissive SSL for Supabase certificates
  if (!pool) {
    pool = new Pool({
      connectionString: dbUrl,
      ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL Pool Error:', err);
    });
  }

  return async function sql(strings, ...values) {
    let queryText = '';
    for (let i = 0; i < strings.length; i++) {
      queryText += strings[i];
      if (i < values.length) {
        queryText += `$${i + 1}`;
      }
    }
    // Sanitize values: convert undefined to SQL NULL
    const sanitizedValues = values.map((v) => (v === undefined ? null : v));
    const result = await pool.query(queryText, sanitizedValues);
    return result.rows;
  };
};

export const sql = (strings, ...values) => {
  const queryFn = getSql();
  return queryFn(strings, ...values);
};

// Initialize tables if they do not exist
let tablesInitialized = false;

export async function ensureTables() {
  if (tablesInitialized) return;
  try {
    const sql = getSql();

    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255),
        google_id VARCHAR(255) UNIQUE,
        avatar_url TEXT,
        api_token VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create watchlists table
    await sql`
      CREATE TABLE IF NOT EXISTS watchlists (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        session_id VARCHAR(255),
        anime_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        image_url TEXT,
        banner_url TEXT,
        genres JSONB,
        format VARCHAR(50),
        episodes_count INTEGER,
        score NUMERIC(4, 2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create watch_histories table
    await sql`
      CREATE TABLE IF NOT EXISTS watch_histories (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        session_id VARCHAR(255),
        anime_id INTEGER NOT NULL,
        anime_title VARCHAR(255) NOT NULL,
        anime_image TEXT,
        anime_banner TEXT,
        episode_number INTEGER NOT NULL DEFAULT 1,
        progress_seconds INTEGER NOT NULL DEFAULT 0,
        duration_seconds INTEGER NOT NULL DEFAULT 0,
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        last_watched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create site_visits analytics table
    await sql`
      CREATE TABLE IF NOT EXISTS site_visits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        session_id VARCHAR(255),
        visitor_hash VARCHAR(255) NOT NULL,
        path VARCHAR(255) NOT NULL DEFAULT '/',
        referrer TEXT,
        user_agent TEXT,
        country VARCHAR(100),
        device_type VARCHAR(50),
        is_bot BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create announcements table
    await sql`
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'info',
        badge VARCHAR(50) DEFAULT 'ANNOUNCEMENT',
        link_url TEXT,
        link_text VARCHAR(100),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_dismissible BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create live_sessions real-time active visitor table
    await sql`
      CREATE TABLE IF NOT EXISTS live_sessions (
        session_id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        user_email VARCHAR(255),
        user_name VARCHAR(255),
        current_path VARCHAR(500) NOT NULL DEFAULT '/',
        page_title VARCHAR(500),
        referrer TEXT,
        device_type VARCHAR(50) DEFAULT 'Desktop',
        browser VARCHAR(100),
        ip_address VARCHAR(100),
        country VARCHAR(100),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        last_heartbeat_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_live_sessions_heartbeat ON live_sessions(last_heartbeat_at DESC)
    `.catch(() => {});

    // Disable RLS so the application backend has full read/write access
    await sql`ALTER TABLE users DISABLE ROW LEVEL SECURITY;`.catch(() => {});
    await sql`ALTER TABLE watchlists DISABLE ROW LEVEL SECURITY;`.catch(() => {});
    await sql`ALTER TABLE watch_histories DISABLE ROW LEVEL SECURITY;`.catch(() => {});
    await sql`ALTER TABLE site_visits DISABLE ROW LEVEL SECURITY;`.catch(() => {});
    await sql`ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;`.catch(() => {});
    await sql`ALTER TABLE live_sessions DISABLE ROW LEVEL SECURITY;`.catch(() => {});

    tablesInitialized = true;
  } catch (err) {
    console.error('Error ensuring database tables:', err);
    throw err;
  }
}
