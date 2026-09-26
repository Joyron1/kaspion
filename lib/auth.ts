import 'server-only';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { timingSafeEqual } from 'node:crypto';
import { env, hasAdmin } from './env';

const COOKIE = 'kaspion_admin';
const MAX_AGE = 60 * 60 * 24 * 30; // a parent logs in once a month at most

function key() {
  return new TextEncoder().encode(env.authSecret);
}

export function checkPassword(input: string): boolean {
  if (!hasAdmin()) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(env.adminPassword);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function startSession() {
  const token = await new SignJWT({ role: 'parent' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  if (!hasAdmin()) return false;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, key());
    return true;
  } catch {
    return false;
  }
}

/** For route handlers: returns a 401 response when the caller is not the parent. */
export async function denyUnlessAdmin(): Promise<Response | null> {
  if (await isAdmin()) return null;
  return Response.json({ error: 'צריך להתחבר כהורה כדי לערוך.' }, { status: 401 });
}
