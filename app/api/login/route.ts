import { checkPassword, endSession, startSession } from '@/lib/auth';
import { hasAdmin } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!hasAdmin()) {
    return Response.json({ error: 'לא הוגדרו ADMIN_PASSWORD ו-AUTH_SECRET בשרת.' }, { status: 503 });
  }
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!password || !checkPassword(password)) {
    await new Promise(r => setTimeout(r, 600)); // slow down guessing
    return Response.json({ error: 'הסיסמה לא נכונה' }, { status: 401 });
  }
  await startSession();
  return Response.json({ ok: true });
}

export async function DELETE() {
  await endSession();
  return Response.json({ ok: true });
}
