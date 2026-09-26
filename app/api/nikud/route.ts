import { denyUnlessAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Automatic nikud through Dicta's Nakdan (https://nakdan.dicta.org.il).
// The result is a suggestion: the parent reviews it in the editor before saving.
const URL_DEFAULT = 'https://nakdan-2-0.loadbalancer.dicta.org.il/api';

type Json = unknown;

function firstOption(opt: Json): string | null {
  if (typeof opt === 'string') return opt;
  if (Array.isArray(opt) && typeof opt[0] === 'string') return opt[0];
  if (opt && typeof opt === 'object') {
    const o = opt as Record<string, Json>;
    for (const k of ['w', 'word', 'text']) if (typeof o[k] === 'string') return o[k] as string;
  }
  return null;
}

function assemble(json: Json): string | null {
  const items = Array.isArray(json) ? json
    : json && typeof json === 'object' && Array.isArray((json as { data?: Json[] }).data) ? (json as { data: Json[] }).data
    : null;
  if (!items) return null;
  let out = '';
  for (const it of items) {
    if (!it || typeof it !== 'object') continue;
    const item = it as Record<string, Json>;
    const word = typeof item.word === 'string' ? item.word : '';
    if (item.sep) { out += word; continue; }
    const nested = item.nakdan && typeof item.nakdan === 'object' ? (item.nakdan as Record<string, Json>).options : undefined;
    const opts = (Array.isArray(item.options) ? item.options : Array.isArray(nested) ? nested : []) as Json[];
    out += (opts.length ? firstOption(opts[0]) : null) ?? word;
  }
  return out.replace(/\|/g, '');
}

export async function POST(req: Request) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  if (!text || !text.trim()) return Response.json({ error: 'אין טקסט לניקוד' }, { status: 400 });

  const payload: Record<string, unknown> = {
    task: 'nakdan', data: text.slice(0, 4000), genre: 'modern',
    addmorph: true, keepqq: false, nodageshdefmem: false, patachma: false, keepmetagim: true,
  };
  if (process.env.DICTA_API_KEY) payload.apiKey = process.env.DICTA_API_KEY;

  try {
    const res = await fetch(process.env.DICTA_NAKDAN_URL || URL_DEFAULT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=utf-8' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return Response.json({ error: `שירות הניקוד החזיר ${res.status}` }, { status: 502 });
    const result = assemble(await res.json());
    if (!result) return Response.json({ error: 'לא הצלחתי לקרוא את תשובת שירות הניקוד' }, { status: 502 });
    return Response.json({ text: result });
  } catch (e) {
    return Response.json({ error: `שירות הניקוד לא זמין: ${(e as Error).message.slice(0, 120)}` }, { status: 502 });
  }
}
