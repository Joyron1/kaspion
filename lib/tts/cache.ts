import 'server-only';
import { createHash } from 'node:crypto';
import { db, BUCKET, publicAudioUrl } from '../supabase';
import { synthesize, voiceKey } from './providers';

export type TtsResult =
  | { kind: 'url'; url: string; path: string }
  | { kind: 'bytes'; bytes: ArrayBuffer; contentType: string };

const hashOf = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 32);

/**
 * Synthesize speech once per (voice, speed, text) and keep it in Supabase Storage.
 * Without Supabase the audio is returned directly and not cached.
 */
export async function speechFor(text: string, rate = 1): Promise<TtsResult> {
  const client = db();
  if (!client) {
    const s = await synthesize(text, rate);
    return { kind: 'bytes', bytes: s.bytes, contentType: s.contentType };
  }
  const name = `${hashOf(`${voiceKey(rate)}|${text}`)}.mp3`;
  const path = `tts/${name}`;
  const { data: found } = await client.storage.from(BUCKET).list('tts', { search: name, limit: 1 });
  if (found && found.some(f => f.name === name)) return { kind: 'url', url: publicAudioUrl(path)!, path };
  const s = await synthesize(text, rate);
  const up = await client.storage.from(BUCKET).upload(path, s.bytes, { contentType: s.contentType, upsert: true });
  if (up.error) return { kind: 'bytes', bytes: s.bytes, contentType: s.contentType };
  return { kind: 'url', url: publicAudioUrl(path)!, path };
}
