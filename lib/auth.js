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
  await ensureTables();
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded?.id) return null;

  const sql = getSql();
  const users = await sql`
    SELECT id, name, email, avatar_url, created_at 
    FROM users 
    WHERE id = ${decoded.id} 
    LIMIT 1
  `;

  return users[0] || null;
}

