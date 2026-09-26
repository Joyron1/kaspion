import { denyUnlessAdmin } from '@/lib/auth';
import { LEVELS } from '@/lib/content/levels';
import { db, explain } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// POST { level_id, seconds, stages } — anonymous play time, used to tune level length.
export async function POST(req: Request) {
  const client = db();
  if (!client) return Response.json({ ok: false }, { status: 202 });
  const b = (await req.json().catch(() => ({}))) as { level_id?: string; seconds?: number; stages?: number[]; completed?: boolean };
  if (!b.level_id || !LEVELS.some(l => l.id === b.level_id)) return Response.json({ error: 'unknown level' }, { status: 400 });
  const seconds = Math.round(Number(b.seconds));
  if (!Number.isFinite(seconds) || seconds < 5 || seconds > 3600) return Response.json({ error: 'bad duration' }, { status: 400 });
  const stages = Array.isArray(b.stages) ? b.stages.slice(0, 8).map(n => Math.max(0, Math.min(3600, Math.round(Number(n) || 0)))) : null;
  const { error } = await client.from('plays').insert({ level_id: b.level_id, seconds, stages, completed: b.completed !== false });
  if (error) return Response.json({ error: explain(error.message) }, { status: 500 });
  return Response.json({ ok: true });
}

// GET — per-level play-time summary for the parent's editor.
export async function GET() {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const client = db();
  if (!client) return Response.json({ levels: [] });
  const { data, error } = await client.from('plays').select('level_id,seconds,stages,created_at').order('created_at', { ascending: false }).limit(2000);
  if (error) return Response.json({ error: explain(error.message) }, { status: 500 });
  const by = new Map<string, number[]>();
  for (const r of data ?? []) {
    if (!by.has(r.level_id)) by.set(r.level_id, []);
    by.get(r.level_id)!.push(r.seconds);
  }
  const levels = LEVELS.map(l => {
    const s = (by.get(l.id) ?? []).slice().sort((a, b) => a - b);
    const med = s.length ? s[Math.floor(s.length / 2)] : null;
    return { id: l.id, plays: s.length, median: med, min: s[0] ?? null, max: s[s.length - 1] ?? null };
  });
  return Response.json({ levels });
}
