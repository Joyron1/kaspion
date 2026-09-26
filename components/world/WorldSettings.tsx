'use client';

import { useEffect, useState } from 'react';
import type { Line, LineDef, Lines } from '@/lib/content/types';
import type { GameKind } from '@/lib/content/world';
import { Narrator } from '@/game/engine/narrator';
import { COUNT_MAX, COUNT_MIN, writeWorldPrefs, type VoiceChoice, type WorldPrefs } from '@/lib/worldPrefs';
import LineEditor from '../editor/LineEditor';
import s from './settings.module.css';

export interface ParentStatus {
  admin: boolean;       // a parent is logged in
  configured: boolean;  // a parent password exists on the server
  supabase: boolean;    // saving works
  tts: string | null;   // cloud voice name, if any
}

interface Props {
  prefs: WorldPrefs;
  narrator: Narrator;
  cloudVoice: boolean;
  lines: Lines;
  defs: LineDef[];
  parent: ParentStatus;
  onLine: (l: Line) => void;
  onClose: () => void;
  initialTab?: 'play' | 'voice' | 'texts';
}

const GAMES: { id: GameKind; label: string; what: string }[] = [
  { id: 'shadow', label: 'צללים', what: 'צללים לזהות' },
  { id: 'mom', label: 'אמא וגור', what: 'תינוקות להחזיר לאמא' },
  { id: 'memory', label: 'זיכרון בצדפים', what: 'זוגות למצוא' },
  { id: 'maze', label: 'מבוך אלמוגים', what: 'מבוכים' },
  { id: 'color', label: 'צביעה', what: 'חברים לצבוע' },
];

type Tab = 'play' | 'voice' | 'texts';

export default function WorldSettings({ prefs, narrator, cloudVoice, lines, defs, parent, onLine, onClose, initialTab }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab ?? 'play');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [allVoices, setAllVoices] = useState(false);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  // the device's voices arrive a moment after the page loads
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const load = () => setVoices(Narrator.deviceVoices());
    const id = setTimeout(load, 0);
    window.speechSynthesis.addEventListener?.('voiceschanged', load);
    return () => { clearTimeout(id); window.speechSynthesis.removeEventListener?.('voiceschanged', load); };
  }, []);

  const set = (p: Partial<WorldPrefs>) => writeWorldPrefs({ ...prefs, ...p });
  const setCount = (g: GameKind, n: number) => set({ counts: { ...prefs.counts, [g]: Math.min(COUNT_MAX, Math.max(COUNT_MIN, n)) } });
  const hebrew = voices.filter(v => /^(he|iw)/i.test(v.lang));
  const shown = allVoices ? voices : hebrew;

  // the screen applies the choice to the narrator; give it a moment, then play a sample
  const tryVoice = () => {
    narrator.unlock();
    setTimeout(() => void narrator.say('world.start'), 80);
  };
  const choose = (v: VoiceChoice) => { set({ voice: v }); tryVoice(); };

  const sections = [...new Set(defs.map(d => d.section))];
  const match = (d: LineDef) => !q.trim() || `${d.label} ${lines[d.key]?.text ?? ''} ${d.section}`.includes(q.trim());

  return (
    <div className={s.backdrop} role="dialog" aria-modal="true" aria-label="הגדרות המסע">
      <div className={`sheet ${s.panel}`}>
        <header className={s.head}>
          <h2 className="display">הגדרות המסע</h2>
          <button className={s.close} onClick={onClose} aria-label="סגירה">✕</button>
        </header>
        <nav className={s.tabs}>
          <button className={tab === 'play' ? s.tabOn : s.tab} onClick={() => setTab('play')}>משימות</button>
          <button className={tab === 'voice' ? s.tabOn : s.tab} onClick={() => setTab('voice')}>קול הקריין</button>
          <button className={tab === 'texts' ? s.tabOn : s.tab} onClick={() => setTab('texts')}>טקסטים, ניקוד והקלטה</button>
        </nav>

        {tab === 'play' && (
          <section className={s.body}>
            <p className={s.help}>כמה פעמים הילד עושה את המשימה בכל משחק. אחרי זה ממשיכים לשחות לתחנה הבאה.</p>
            {GAMES.map(g => (
              <div key={g.id} className={s.countRow}>
                <div>
                  <div className={s.countName}>{g.label}</div>
                  <div className={s.countWhat}>{prefs.counts[g.id]} {g.what}</div>
                </div>
                <div className={s.stepper}>
                  <button onClick={() => setCount(g.id, prefs.counts[g.id] - 1)} disabled={prefs.counts[g.id] <= COUNT_MIN} aria-label={`פחות ${g.label}`}>−</button>
                  <output dir="ltr">{prefs.counts[g.id]}</output>
                  <button onClick={() => setCount(g.id, prefs.counts[g.id] + 1)} disabled={prefs.counts[g.id] >= COUNT_MAX} aria-label={`יותר ${g.label}`}>+</button>
                </div>
              </div>
            ))}
            <p className={s.note}>השינוי חל מהמשחק הבא. ההגדרות נשמרות במכשיר הזה.</p>
          </section>
        )}

        {tab === 'voice' && (
          <section className={s.body}>
            <p className={s.help}>בוחרים איזה קול יקריא את הסיפור והמשימות במכשיר הזה. הקלטה שלכם לטקסט מסוים תמיד קודמת לכל קול.</p>
            <div className={s.voices} role="radiogroup" aria-label="קול הקריין">
              <label className={s.voice}>
                <input type="radio" name="voice" checked={prefs.voice === 'auto'} onChange={() => choose('auto')} />
                <span><b>אוטומטי</b><small>הקול הטוב ביותר שיש: {cloudVoice ? 'קול הענן' : 'הקול העברי של המכשיר'}</small></span>
              </label>
              {cloudVoice && (
                <label className={s.voice}>
                  <input type="radio" name="voice" checked={prefs.voice === 'cloud'} onChange={() => choose('cloud')} />
                  <span><b>קול הענן</b><small>{parent.tts ?? 'קול מהשרת'}</small></span>
                </label>
              )}
              {shown.map(v => (
                <label key={v.name} className={s.voice}>
                  <input type="radio" name="voice" checked={prefs.voice === `device:${v.name}`} onChange={() => choose(`device:${v.name}`)} />
                  <span><b>{v.name}</b><small dir="ltr">{v.lang}{v.localService ? ' · במכשיר' : ' · ברשת'}</small></span>
                </label>
              ))}
            </div>
            {hebrew.length === 0 && <p className={s.warn}>במכשיר הזה לא נמצא קול בעברית. אפשר להתקין קול עברי בהגדרות הדיבור של המכשיר, לבחור קול ענן, או להקליט את הטקסטים בלשונית &quot;טקסטים, ניקוד והקלטה&quot;.</p>}
            <label className={s.check}><input type="checkbox" checked={allVoices} onChange={e => setAllVoices(e.target.checked)} /> להציג גם קולות בשפות אחרות</label>
            <label className={s.rate}>
              <span>מהירות הדיבור</span>
              <input type="range" min={0.6} max={1.3} step={0.05} value={prefs.rate} onChange={e => set({ rate: Number(e.target.value) })} />
              <output dir="ltr">{prefs.rate.toFixed(2)}</output>
            </label>
            <button className={s.btn} onClick={tryVoice}>▶ להשמיע דוגמה</button>
          </section>
        )}

        {tab === 'texts' && (
          <section className={s.body}>
            {!parent.admin ? (
              <ParentLogin configured={parent.configured} />
            ) : (
              <>
                <p className={s.help}>כל טקסט שהקריין אומר במסע. מנקדים עם מקלדת הניקוד, ומקליטים את הקול שלכם: ההקלטה תושמע במקום הקריין.</p>
                {!parent.supabase && <p className={s.warn}>Supabase לא מחובר, אז אי אפשר לשמור.</p>}
                <input className={s.search} placeholder="חיפוש טקסט..." value={q} onChange={e => setQ(e.target.value)} />
                {sections.map(sec => {
                  const items = defs.filter(d => d.section === sec && match(d));
                  if (!items.length) return null;
                  return (
                    <details key={sec} className={s.group} open={Boolean(q.trim())}>
                      <summary>{sec} <span className={s.count}>{items.filter(d => lines[d.key]?.audioUrl).length}/{items.length} מוקלטים</span></summary>
                      {items.map(d => (
                        open === d.key ? (
                          <LineEditor key={d.key} def={d} line={lines[d.key]} narrator={narrator} status={{ supabase: parent.supabase, tts: parent.tts }} onSaved={onLine} />
                        ) : (
                          <button key={d.key} className={s.lineBtn} onClick={() => setOpen(d.key)}>
                            <span className={s.lineLabel}>{d.label}{lines[d.key]?.audioUrl ? ' 🎙' : ''}</span>
                            <span className={s.lineText}>{lines[d.key]?.text}</span>
                          </button>
                        )
                      ))}
                    </details>
                  );
                })}
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function ParentLogin({ configured }: { configured: boolean }) {
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    setBusy(false);
    if (res.ok) { location.hash = 'texts'; location.reload(); }
    else setErr((await res.json().catch(() => ({}))).error || 'ההתחברות נכשלה');
  };
  return (
    <form className={s.login} onSubmit={submit}>
      <p className={s.help}>עריכה, ניקוד והקלטה הם להורים בלבד. נכנסים עם סיסמת ההורים.</p>
      {!configured && <p className={s.warn}>עוד לא הוגדרה סיסמת הורים בשרת (ADMIN_PASSWORD ו-AUTH_SECRET ב-Vercel).</p>}
      <input type="password" className={s.search} placeholder="סיסמה" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
      {err && <p className={s.warn}>{err}</p>}
      <button className="big" disabled={busy || !password}>{busy ? 'בודק…' : 'כניסה'}</button>
    </form>
  );
}
