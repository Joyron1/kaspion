import { loadContent } from '@/lib/content/load';
import { activeTtsProvider } from '@/lib/env';
import { isAdmin } from '@/lib/auth';
import { speechFor } from '@/lib/tts/cache';

export const dynamic = 'force-dynamic';

// POST { key }  -> narrate a saved line (anyone: the game needs it)
// POST { text } -> preview an unsaved wording (parent only)
export async function POST(req: Request) {
  if (!activeTtsProvider()) return Response.json({ error: 'לא הוגדר קול ענן' }, { status: 501 });
  const body = (await req.json().catch(() => ({}))) as { key?: string; text?: string };
  const content = await loadContent();
  const rate = Math.min(1.15, Math.max(0.8, content.narrator.rate));

  let text = '';
  if (typeof body.text === 'string') {
    if (!(await isAdmin())) return Response.json({ error: 'צריך להתחבר כהורה' }, { status: 401 });
    text = body.text.slice(0, 1200);
  } else if (typeof body.key === 'string') {
    const line = content.lines[body.key];
    if (!line) return Response.json({ error: 'אין טקסט כזה' }, { status: 404 });
    text = line.speech;
  }
  if (!text.trim()) return Response.json({ error: 'אין מה להקריא' }, { status: 400 });

  try {
    const r = await speechFor(text, rate);
    if (r.kind === 'url') return Response.json({ url: r.url });
    return new Response(r.bytes, { headers: { 'Content-Type': r.contentType, 'Cache-Control': 'no-store' } });
  } catch (e) {
    return Response.json({ error: `שירות הקול נכשל: ${(e as Error).message.slice(0, 200)}` }, { status: 502 });
  }
}
