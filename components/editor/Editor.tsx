'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { ContentBundle, LevelMeta, Line, LineDef, NarratorSettings } from '@/lib/content/types';
import { Narrator } from '@/game/engine/narrator';
import { hasNikud, nikudCoverage } from '@/lib/nikud';
import LineEditor from './LineEditor';
import s from './editor.module.css';

interface Status { supabase: boolean; tts: string | null; admin: boolean }
interface Props {
  defs: LineDef[];
  content: ContentBundle;
  levels: Pick<LevelMeta, 'id' | 'title' | 'knobs' | 'config'>[];
  status: Status;
}

type Tab = 'story' | 'level' | 'ui' | 'voice' | 'levels' | 'stats';
const TABS: { id: Tab; label: string }[] = [
  { id: 'story', label: 'הסיפור' },
  { id: 'level', label: 'טקסטים בשלבים' },
  { id: 'ui', label: 'כפתורים ומחמאות' },
  { id: 'voice', label: 'הקריין' },
  { id: 'levels', label: 'אורך השלבים' },
  { id: 'stats', label: 'זמני משחק' },
];

type Filter = 'all' | 'noNikud' | 'notReviewed';

export default function Editor({ defs, content, levels, status }: Props) {
  const [lines, setLines] = useState(content.lines);
  const [tab, setTab] = useState<Tab>('story');
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const narrator = useMemo(() => new Narrator(content.lines, { settings: content.narrator, cloud: content.cloudVoice }), [content]);

  const onSaved = (l: Line) => setLines(prev => ({ ...prev, [l.key]: l }));

  const shown = defs.filter(d => {
    if ((tab === 'story' || tab === 'level' || tab === 'ui') && d.group !== tab) return false;
    const l = lines[d.key];
    if (filter === 'noNikud' && nikudCoverage(l.text) > 0.6) return false;
    if (filter === 'notReviewed' && l.reviewed) return false;
    if (q.trim() && !(`${d.label} ${l.text} ${d.section}`).includes(q.trim())) return false;
    return true;
  });
  const sections = [...new Set(shown.map(d => d.section))];

  const total = defs.length;
  const reviewed = defs.filter(d => lines[d.key]?.reviewed).length;
  const vowelled = defs.filter(d => hasNikud(lines[d.key]?.text ?? '')).length;
  const withAudio = defs.filter(d => lines[d.key]?.audioUrl).length;

  const logout = async () => { await fetch('/api/login', { method: 'DELETE' }); location.reload(); };

  return (
    <div className={s.page}>
      <header className={s.top}>
        <div>
          <h1 className="display">עריכת הטקסטים והקריין</h1>
          <p className={s.lead}>
            כאן משנים כל טקסט שמופיע במשחק ובסיפור, מוסיפים ניקוד כדי שהקריין יגה נכון, ומקליטים או יוצרים הקראה קבועה.
          </p>
        </div>
        <div className={s.topActions}>
          <Link className={s.btn} href="/">לאתר</Link>
          <button className={s.btnGhost} onClick={logout}>התנתקות</button>
        </div>
      </header>

      {!status.supabase && (
        <p className={s.banner}>
          Supabase עוד לא מחובר, אז אפשר לנסות ולהאזין אבל לא לשמור. אחרי שמגדירים את SUPABASE_URL ו-SUPABASE_SERVICE_ROLE_KEY השמירה תעבוד.
        </p>
      )}

      <div className={s.summary}>
        <span><b>{total}</b> טקסטים</span>
        <span><b>{vowelled}</b> עם ניקוד</span>
        <span><b>{reviewed}</b> נבדקו</span>
        <span><b>{withAudio}</b> עם הקראה שמורה</span>
        <span>קול ענן: <b>{status.tts ?? 'לא מוגדר'}</b></span>
      </div>

      <nav className={s.tabs} role="tablist">
        {TABS.map(t => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? s.tabOn : s.tab} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </nav>

      {(tab === 'story' || tab === 'level' || tab === 'ui') && (
        <>
          <div className={s.filters}>
            <input id="search" className={s.search} placeholder="חיפוש בטקסטים" value={q} onChange={e => setQ(e.target.value)} />
            <select id="filter" value={filter} onChange={e => setFilter(e.target.value as Filter)} className={s.select}>
              <option value="all">הכול</option>
              <option value="noNikud">רק בלי ניקוד מלא</option>
              <option value="notReviewed">רק מה שלא נבדק</option>
            </select>
          </div>
          {sections.map(sec => (
            <section key={sec} className={s.section}>
              <h2 className="display">{sec}</h2>
              {shown.filter(d => d.section === sec).map(d => (
                <LineEditor key={d.key} def={d} line={lines[d.key]} narrator={narrator} status={status} onSaved={onSaved} />
              ))}
            </section>
          ))}
          {shown.length === 0 && <p className={s.empty}>אין טקסטים שמתאימים לסינון.</p>}
        </>
      )}

      {tab === 'voice' && <VoiceSettings initial={content.narrator} narrator={narrator} status={status} />}
      {tab === 'levels' && <LevelKnobs levels={levels} config={content.levelConfig} status={status} />}
      {tab === 'stats' && <Stats levels={levels} status={status} />}
    </div>
  );
}

function VoiceSettings({ initial, narrator, status }: { initial: NarratorSettings; narrator: Narrator; status: Status }) {
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState('');
  const [voices, setVoices] = useState<string[]>([]);
  useEffect(() => {
    const read = () => setVoices(window.speechSynthesis?.getVoices().filter(x => /^(he|iw)/i.test(x.lang)).map(x => `${x.name} (${x.lang})`) ?? []);
    read();
    window.speechSynthesis?.addEventListener?.('voiceschanged', read);
    return () => window.speechSynthesis?.removeEventListener?.('voiceschanged', read);
  }, []);
  const test = () => { narrator.setSettings(v); narrator.unlock(); void narrator.say({ text: 'שָׁלוֹם! אֲנִי כַּסְפִּיּוֹן, דָּג קָטָן וְכָסוֹף.' }, { local: true }); };
  const save = async () => {
    const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'narrator', value: v }) });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? 'נשמר.' : d.error || 'השמירה נכשלה');
  };
  return (
    <section className={s.section}>
      <h2 className="display">הקריין</h2>
      <div className={s.card}>
        <p className={s.help}>
          סדר העדיפויות של הקריין: קודם הקלטה ששמרתם לטקסט, אחר כך קול ענן (אם הוגדר בשרת), ואחר כך הקול העברי של המכשיר.
          בקול המכשיר הניקוד עוזר, אבל לא כל מכשיר מכבד אותו. להגייה מושלמת כדאי להקליט או ליצור ולשמור הקראה.
        </p>
        <p className={s.help}>קולות עבריים במכשיר הזה: {voices.length ? voices.join(', ') : 'לא נמצאו. במכשיר הזה יוצג טקסט בלבד, אלא אם יש הקלטה או קול ענן.'}</p>
        <label className={s.range}>מהירות הדיבור: <b>{v.rate.toFixed(2)}</b>
          <input id="rate" type="range" min={0.6} max={1.3} step={0.05} value={v.rate} onChange={e => setV({ ...v, rate: Number(e.target.value) })} />
        </label>
        <label className={s.range}>גובה הקול (קול המכשיר): <b>{v.pitch.toFixed(2)}</b>
          <input id="pitch" type="range" min={0.6} max={1.5} step={0.05} value={v.pitch} onChange={e => setV({ ...v, pitch: Number(e.target.value) })} />
        </label>
        <label className={s.check}>
          <input id="prefer-cloud" type="checkbox" checked={v.preferCloud} onChange={e => setV({ ...v, preferCloud: e.target.checked })} disabled={!status.tts} />
          להשתמש בקול הענן כשאין הקלטה {status.tts ? `(${status.tts})` : '(לא מוגדר בשרת)'}
        </label>
        <div className={s.actions}>
          <button className={s.btn} onClick={test}>▶ ניסיון</button>
          <button className={s.btnMain} onClick={save} disabled={!status.supabase}>שמירה</button>
          {msg && <span className={s.ok}>{msg}</span>}
        </div>
      </div>
    </section>
  );
}

function LevelKnobs({ levels, config, status }: { levels: Props['levels']; config: ContentBundle['levelConfig']; status: Status }) {
  const [vals, setVals] = useState(config);
  const [msg, setMsg] = useState<Record<string, string>>({});
  const save = async (id: string) => {
    const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: `level.${id}`, value: vals[id] }) });
    const d = await res.json().catch(() => ({}));
    setMsg(m => ({ ...m, [id]: res.ok ? 'נשמר' : d.error || 'נכשל' }));
  };
  return (
    <section className={s.section}>
      <h2 className="display">אורך וקושי של כל שלב</h2>
      <p className={s.help}>המטרה: כל שלב בין דקה וחצי לשלוש דקות. אם בלשונית &quot;זמני משחק&quot; שלב יוצא קצר מדי, מעלים את הכמויות; אם ארוך או מתסכל, מורידים.</p>
      {levels.map((lv, i) => (
        <div key={lv.id} className={s.card}>
          <div className={s.label}>שלב {i + 1}: {lv.title}</div>
          {Object.entries(lv.knobs).map(([k, knob]) => (
            <label key={k} className={s.range}>{knob.label}: <b>{vals[lv.id]?.[k] ?? lv.config[k]}</b>
              <input id={`${lv.id}-${k}`} type="range" min={knob.min} max={knob.max} step={knob.step ?? 1}
                value={vals[lv.id]?.[k] ?? lv.config[k]}
                onChange={e => setVals(v => ({ ...v, [lv.id]: { ...v[lv.id], [k]: Number(e.target.value) } }))} />
            </label>
          ))}
          <div className={s.actions}>
            <button className={s.btnMain} onClick={() => save(lv.id)} disabled={!status.supabase}>שמירה</button>
            <button className={s.btnGhost} onClick={() => setVals(v => ({ ...v, [lv.id]: { ...lv.config } }))}>ברירת מחדל</button>
            <Link className={s.btn} href={`/play/${lv.id}`} target="_blank">לנסות את השלב</Link>
            {msg[lv.id] && <span className={s.ok}>{msg[lv.id]}</span>}
          </div>
        </div>
      ))}
    </section>
  );
}

interface StatRow { id: string; plays: number; median: number | null; min: number | null; max: number | null }

function Stats({ levels, status }: { levels: Props['levels']; status: Status }) {
  const [rows, setRows] = useState<StatRow[] | null>(null);
  useEffect(() => {
    fetch('/api/plays').then(r => r.json()).then(d => setRows(d.levels ?? [])).catch(() => setRows([]));
  }, []);
  const fmt = (n: number | null) => (n === null ? '—' : `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`);
  const verdict = (m: number | null) => (m === null ? ['אין נתונים', ''] : m < 90 ? ['קצר מדי', s.chipWarn] : m > 180 ? ['ארוך מדי', s.chipWarn] : ['בטווח', s.chipOk]);
  return (
    <section className={s.section}>
      <h2 className="display">כמה זמן לוקח כל שלב</h2>
      <p className={s.help}>כל פעם שילד מסיים שלב נשמר כמה זמן זה לקח (בלי שום פרט מזהה). היעד הוא 1:30 עד 3:00.</p>
      {!status.supabase && <p className={s.banner}>הנתונים נשמרים רק כש-Supabase מחובר.</p>}
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead><tr><th>שלב</th><th>משחקים</th><th>חציון</th><th>הכי מהיר</th><th>הכי ארוך</th><th>מצב</th></tr></thead>
          <tbody>
            {levels.map((lv, i) => {
              const r = rows?.find(x => x.id === lv.id);
              const [label, cls] = verdict(r?.median ?? null);
              return (
                <tr key={lv.id}>
                  <td>{i + 1}. {lv.title}</td>
                  <td>{r?.plays ?? 0}</td>
                  <td>{fmt(r?.median ?? null)}</td>
                  <td>{fmt(r?.min ?? null)}</td>
                  <td>{fmt(r?.max ?? null)}</td>
                  <td><span className={`${s.chip} ${cls}`}>{label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
