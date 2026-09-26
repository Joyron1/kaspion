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

export function publicAudioUrl(path: string | null | undefined, version?: string | null): string | null {
  if (!path || !env.supabaseUrl) return null;
  const base = `${env.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/${path}`;
  return version ? `${base}?v=${encodeURIComponent(version)}` : base;
}
