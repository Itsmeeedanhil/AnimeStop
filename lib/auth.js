import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getSql, ensureTables } from './db';

const JWT_SECRET = process.env.JWT_SECRET || process.env.APP_KEY || 'animestop_jwt_secret_luxury_super_secure_key_2026';

export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url || null,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

export async function getUserFromRequest(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    let token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token && request.cookies) {
      token = request.cookies.get('animestop_token')?.value || request.cookies.get('token')?.value;
    }

    if (!token) return null;

    const decoded = verifyToken(token);
    if (!decoded || !decoded.email) return null;

    const cleanEmail = decoded.email.toLowerCase().trim();
    const cleanName = decoded.name || cleanEmail.split('@')[0] || 'Anime Fan';

    try {
      await ensureTables();
      const sql = getSql();
      
      let users = await sql`
        SELECT id, name, email, avatar_url, created_at 
        FROM users 
        WHERE email = ${cleanEmail}
        LIMIT 1
      `;

      // If user row does not exist in Supabase database yet, auto-provision it immediately
      if (users.length === 0) {
        const inserted = await sql`
          INSERT INTO users (name, email, avatar_url)
          VALUES (${cleanName}, ${cleanEmail}, ${decoded.avatar_url || null})
          ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url)
          RETURNING id, name, email, avatar_url, created_at
        `;
        if (inserted.length > 0) {
          users = inserted;
        }
      }

      if (users.length > 0) {
        return users[0];
      }
    } catch (dbErr) {
      console.error('Database user lookup/provision error in getUserFromRequest:', dbErr);
    }

    return {
      id: decoded.id,
      name: cleanName,
      email: cleanEmail,
      avatar_url: decoded.avatar_url || null,
    };
  } catch (err) {
    return null;
  }
}
