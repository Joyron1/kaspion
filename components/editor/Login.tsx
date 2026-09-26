'use client';

import { useState } from 'react';
import s from './editor.module.css';

export default function Login({ configured }: { configured: boolean }) {
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    setBusy(false);
    if (res.ok) location.reload();
    else setErr((await res.json().catch(() => ({}))).error || 'ההתחברות נכשלה');
  };
  return (
    <div className={s.loginWrap}>
      <form className={`sheet ${s.login}`} onSubmit={submit}>
        <h1 className="display">כניסת הורים</h1>
        <p className={s.help}>כאן עורכים את הטקסטים, הניקוד והקריין. הילדים לא צריכים להיכנס לכאן.</p>
        {!configured && <p className={s.banner}>עוד לא הוגדרו ADMIN_PASSWORD ו-AUTH_SECRET בשרת (ב-Vercel תחת Environment Variables).</p>}
        <label className={s.fieldLabel} htmlFor="pw">סיסמה</label>
        <input id="pw" type="password" className={s.search} value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" autoFocus />
        {err && <p className={s.err}>{err}</p>}
        <button className="big" disabled={busy || !password}>{busy ? 'בודק…' : 'כניסה'}</button>
      </form>
    </div>
  );
}
