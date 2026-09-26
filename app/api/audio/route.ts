import { denyUnlessAdmin } from '@/lib/auth';
import { allLineDefs } from '@/lib/content/registry';
import { loadContent } from '@/lib/content/load';
import { db, BUCKET, publicAudioUrl } from '@/lib/supabase';
import { activeTtsProvider } from '@/lib/env';
import { speechFor } from '@/lib/tts/cache';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 8 * 1024 * 1024;
const EXT: Record<string, string> = {
  'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3',
  'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac', 'audio/wav': 'wav', 'audio/x-wav': 'wav',
};

async function saveRow(key: string, path: string, source: 'recorded' | 'uploaded' | 'tts', audioFor: string) {
  const client = db()!;
  const { data: prev } = await client.from('lines').select('audio_path').eq('key', key).maybeSingle();
  const now = new Date().toISOString();
  const { error } = await client.from('lines').upsert(
    { key, audio_path: path, audio_source: source, audio_for: audioFor, updated_at: now },
    { onConflict: 'key' },
  );
  if (error) throw new Error(error.message);
  // recordings are per line; generated audio lives in the shared tts/ cache
  if (prev?.audio_path && prev.audio_path !== path && !String(prev.audio_path).startsWith('tts/')) {
    await client.storage.from(BUCKET).remove([prev.audio_path]);
  }
  return publicAudioUrl(path, now);
}

// POST multipart { key, source, file }  -> attach a recording or an uploaded file
// POST json { key, generate: true }     -> attach cloud-voice audio for the current wording
export async function POST(req: Request) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const client = db();
  if (!client) return Response.json({ error: 'Supabase לא מחובר, אז אי אפשר לשמור הקלטות עדיין.' }, { status: 503 });
  const keys = new Set(allLineDefs().map(d => d.key));
  const content = await loadContent();

  if ((req.headers.get('content-type') || '').includes('application/json')) {
    const { key } = (await req.json().catch(() => ({}))) as { key?: string };
    if (!key || !keys.has(key)) return Response.json({ error: 'אין טקסט כזה' }, { status: 404 });
    if (!activeTtsProvider()) return Response.json({ error: 'לא הוגדר קול ענן' }, { status: 501 });
    const speech = content.lines[key].speech;
    try {
      const r = await speechFor(speech, Math.min(1.15, Math.max(0.8, content.narrator.rate)));
      if (r.kind !== 'url') return Response.json({ error: 'לא הצלחתי לשמור את הקובץ' }, { status: 500 });
      const url = await saveRow(key, r.path, 'tts', speech);
      return Response.json({ url });
    } catch (e) {
      return Response.json({ error: (e as Error).message.slice(0, 200) }, { status: 502 });
    }
  }

  const form = await req.formData().catch(() => null);
  const key = String(form?.get('key') ?? '');
  const source = form?.get('source') === 'recorded' ? 'recorded' : 'uploaded';
  const file = form?.get('file');
  if (!keys.has(key)) return Response.json({ error: 'אין טקסט כזה' }, { status: 404 });
  if (!(file instanceof File)) return Response.json({ error: 'לא התקבל קובץ שמע' }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: 'הקובץ גדול מ-8MB' }, { status: 413 });
  const type = (file.type || '').split(';')[0];
  const ext = EXT[type];
  if (!ext) return Response.json({ error: `סוג קובץ לא נתמך (${type || 'לא ידוע'})` }, { status: 415 });
  const path = `lines/${key.replace(/[^a-zA-Z0-9._-]/g, '_')}/${Date.now()}.${ext}`;
  const up = await client.storage.from(BUCKET).upload(path, await file.arrayBuffer(), { contentType: type, upsert: false });
  if (up.error) return Response.json({ error: up.error.message }, { status: 500 });
  try {
    const url = await saveRow(key, path, source, content.lines[key].speech);
    return Response.json({ url });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

// DELETE { key } removes the audio of a line (the narrator falls back to a voice).
export async function DELETE(req: Request) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const client = db();
  if (!client) return Response.json({ error: 'Supabase לא מחובר' }, { status: 503 });
  const { key } = (await req.json().catch(() => ({}))) as { key?: string };
  if (!key) return Response.json({ error: 'חסר מפתח' }, { status: 400 });
  const { data } = await client.from('lines').select('audio_path').eq('key', key).maybeSingle();
  if (data?.audio_path && !String(data.audio_path).startsWith('tts/')) {
    await client.storage.from(BUCKET).remove([data.audio_path]);
  }
  const { error } = await client.from('lines')
    .update({ audio_path: null, audio_source: null, audio_for: null, updated_at: new Date().toISOString() })
    .eq('key', key);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
