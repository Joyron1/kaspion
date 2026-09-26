import { denyUnlessAdmin } from '@/lib/auth';
import { allLineDefs } from '@/lib/content/registry';
import { db, BUCKET } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const known = () => new Set(allLineDefs().map(d => d.key));

// PUT { key, text, speech, reviewed } saves the parent's wording.
export async function PUT(req: Request) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const client = db();
  if (!client) return Response.json({ error: 'Supabase לא מחובר, אז אי אפשר לשמור עדיין.' }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as { key?: string; text?: string | null; speech?: string | null; reviewed?: boolean };
  if (!b.key || !known().has(b.key)) return Response.json({ error: 'אין טקסט כזה' }, { status: 404 });
  const clean = (s: string | null | undefined) => (typeof s === 'string' && s.trim() ? s.trim().slice(0, 2000) : null);
  const row = {
    key: b.key,
    text: clean(b.text),
    speech: clean(b.speech),
    reviewed: Boolean(b.reviewed),
    updated_at: new Date().toISOString(),
  };
  const { error } = await client.from('lines').upsert(row, { onConflict: 'key' });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

// DELETE { key } puts a line back to the default wording and removes its audio.
export async function DELETE(req: Request) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const client = db();
  if (!client) return Response.json({ error: 'Supabase לא מחובר' }, { status: 503 });
  const { key } = (await req.json().catch(() => ({}))) as { key?: string };
  if (!key || !known().has(key)) return Response.json({ error: 'אין טקסט כזה' }, { status: 404 });
  const { data } = await client.from('lines').select('audio_path').eq('key', key).maybeSingle();
  if (data?.audio_path && !String(data.audio_path).startsWith('tts/')) {
    await client.storage.from(BUCKET).remove([data.audio_path]);
  }
  const { error } = await client.from('lines').delete().eq('key', key);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
