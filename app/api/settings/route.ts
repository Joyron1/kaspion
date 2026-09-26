import { denyUnlessAdmin } from '@/lib/auth';
import { LEVELS } from '@/lib/content/levels';
import { db } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// PUT { key: 'narrator' | 'level.<id>', value: {...} }
export async function PUT(req: Request) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const client = db();
  if (!client) return Response.json({ error: 'Supabase לא מחובר' }, { status: 503 });
  const { key, value } = (await req.json().catch(() => ({}))) as { key?: string; value?: Record<string, unknown> };
  if (!key || !value || typeof value !== 'object') return Response.json({ error: 'בקשה לא תקינה' }, { status: 400 });

  let clean: Record<string, number | boolean> = {};
  if (key === 'narrator') {
    const rate = Number(value.rate), pitch = Number(value.pitch);
    clean = {
      rate: Number.isFinite(rate) ? Math.min(1.3, Math.max(0.6, rate)) : 0.9,
      pitch: Number.isFinite(pitch) ? Math.min(1.5, Math.max(0.6, pitch)) : 1.05,
      preferCloud: value.preferCloud !== false,
    };
  } else if (key.startsWith('level.')) {
    const lv = LEVELS.find(l => `level.${l.id}` === key);
    if (!lv) return Response.json({ error: 'אין שלב כזה' }, { status: 404 });
    for (const [k, knob] of Object.entries(lv.knobs)) {
      const v = Number(value[k]);
      if (Number.isFinite(v)) clean[k] = Math.min(knob.max, Math.max(knob.min, Math.round(v)));
    }
  } else {
    return Response.json({ error: 'הגדרה לא מוכרת' }, { status: 400 });
  }
  const { error } = await client.from('settings').upsert({ key, value: clean, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, value: clean });
}
