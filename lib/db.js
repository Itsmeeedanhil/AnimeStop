import { neon } from '@neondatabase/serverless';

// Retrieve database URL from environment
const getDbUrl = () => {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    'postgresql://neondb_owner:npg_g0aMhyqjY8Jm@ep-long-morning-a131o68u-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
  );
};

let sqlClient = null;

export const getSql = () => {
  if (!sqlClient) {
    sqlClient = neon(getDbUrl());
  }
  return sqlClient;
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
