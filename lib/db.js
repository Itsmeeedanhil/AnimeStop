import { Pool } from 'pg';
import { neon } from '@neondatabase/serverless';

// Retrieve database URL from environment or construct from individual variables
const getDbUrl = () => {
  // Support official Vercel Supabase Integration variables (POSTGRES_URL, POSTGRES_PRISMA_URL)
  let url =
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL ||
    process.env.SUPABASE_POSTGRES_URL;

  // Construct from Vercel POSTGRES_* variables if present
  if (!url && process.env.POSTGRES_HOST && process.env.POSTGRES_USER && process.env.POSTGRES_PASSWORD) {
    const user = encodeURIComponent(process.env.POSTGRES_USER);
    const pass = encodeURIComponent(process.env.POSTGRES_PASSWORD);
    const host = process.env.POSTGRES_HOST;
    const port = process.env.POSTGRES_PORT || '6543';
    const db = process.env.POSTGRES_DATABASE || 'postgres';
    url = `postgresql://${user}:${pass}@${host}:${port}/${db}?sslmode=require`;
  }

  // Construct from individual DB_* environment variables if present
  if (!url && process.env.DB_HOST && process.env.DB_USERNAME && process.env.DB_PASSWORD) {
    const user = encodeURIComponent(process.env.DB_USERNAME);
    const pass = encodeURIComponent(process.env.DB_PASSWORD);
    const host = process.env.DB_HOST;
    const port = process.env.DB_PORT || '5432';
    const db = process.env.DB_DATABASE || 'postgres';
    url = `postgresql://${user}:${pass}@${host}:${port}/${db}?sslmode=require`;
  }

  if (!url) {
    return 'postgresql://neondb_owner:npg_g0aMhyqjY8Jm@ep-long-morning-a131o68u-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
  }

  // Auto-upgrade Supabase direct host to IPv4 Connection Pooler (port 6543) for AWS/Vercel serverless
  if (url.includes('db.bacsvogyvvsynbksawuo.supabase.co')) {
    url = url.replace('db.bacsvogyvvsynbksawuo.supabase.co:5432', 'aws-0-ap-south-1.pooler.supabase.com:6543');
    url = url.replace('db.bacsvogyvvsynbksawuo.supabase.co', 'aws-0-ap-south-1.pooler.supabase.com:6543');
    if (!url.includes('postgres.bacsvogyvvsynbksawuo:')) {
      url = url.replace('postgres:', 'postgres.bacsvogyvvsynbksawuo:');
    }
  }

  return url;
};

let pool = null;
let neonClient = null;
let currentDbUrl = null;

export const getSql = () => {
  const dbUrl = getDbUrl();

  // If DB URL changes, reset connection
  if (currentDbUrl !== dbUrl) {
    currentDbUrl = dbUrl;
    if (pool) {
      pool.end().catch(() => {});
      pool = null;
    }
    neonClient = null;
  }

  const isNeon = dbUrl.includes('neon.tech');

  if (isNeon) {
    if (!neonClient) {
      neonClient = neon(dbUrl);
    }
    return neonClient;
  }

  // Supabase / Standard PostgreSQL Connection Pool
  if (!pool) {
    pool = new Pool({
      connectionString: dbUrl,
      ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
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
    // Convert any JavaScript undefined values to SQL NULL to prevent pg type errors
    const sanitizedValues = values.map((v) => (v === undefined ? null : v));
    const result = await pool.query(queryText, sanitizedValues);
    return result.rows;
  };
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

    // Create site_visits analytics table (with bot filtering flag)
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

    tablesInitialized = true;
  } catch (err) {
    console.error('Error ensuring database tables:', err);
  }
}
