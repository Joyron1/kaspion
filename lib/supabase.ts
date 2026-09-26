import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, hasSupabase } from './env';

export const BUCKET = 'narration';

let client: SupabaseClient | null = null;

/** Service-role client. Server only; null when Supabase is not configured. */
export function db(): SupabaseClient | null {
  if (!hasSupabase()) return null;
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

/**
 * Supabase write errors in words a parent can act on. The common one: the public
 * (publishable/anon) key was put where the secret key belongs, so every write is refused.
 */
export function explain(message: string): string {
  if (/row-level security|42501|permission denied/i.test(message)) {
    return env.supabaseServiceKey.startsWith('sb_publishable_')
      ? 'אי אפשר לשמור: ב-Vercel הוגדר המפתח הציבורי של Supabase (sb_publishable_…) במקום המפתח הסודי. צריך לשים ב-SUPABASE_SERVICE_ROLE_KEY את ה-Secret key (sb_secret_…) או את service_role, ולפרוס מחדש.'
      : 'אי אפשר לשמור: המפתח של Supabase ב-Vercel לא מורשה לכתוב. צריך לשים ב-SUPABASE_SERVICE_ROLE_KEY את ה-Secret key (sb_secret_…) או את service_role, ולפרוס מחדש.';
  }
  return message;
}

export function publicAudioUrl(path: string | null | undefined, version?: string | null): string | null {
  if (!path || !env.supabaseUrl) return null;
  const base = `${env.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/${path}`;
  return version ? `${base}?v=${encodeURIComponent(version)}` : base;
}
