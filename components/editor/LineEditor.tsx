'use client';

import { useRef, useState } from 'react';
import type { Line, LineDef } from '@/lib/content/types';
import { hasNikud, nikudCoverage, stripNikud } from '@/lib/nikud';
import type { Narrator } from '@/game/engine/narrator';
import NikudPad from './NikudPad';
import Recorder from './Recorder';
import s from './editor.module.css';

interface Props {
  def: LineDef;
  line: Line;
  narrator: Narrator;
  status: { supabase: boolean; tts: string | null };
  onSaved: (line: Line) => void;
}

type Msg = { kind: 'ok' | 'err' | 'info'; text: string } | null;

async function call(url: string, init: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `שגיאה ${res.status}`);
  return data;
}

export default function LineEditor({ def, line, narrator, status, onSaved }: Props) {
  const [text, setText] = useState(line.text);
  const [speech, setSpeech] = useState(line.speech === line.text ? '' : line.speech);
  const [showSpeech, setShowSpeech] = useState(line.speech !== line.text);
  const [reviewed, setReviewed] = useState(line.reviewed);
  const [audioUrl, setAudioUrl] = useState(line.audioUrl);
  const [audioSource, setAudioSource] = useState(line.audioSource);
  const [suggest, setSuggest] = useState<string | null>(null);
  const [recording, setRecording] = useState<{ blob: Blob; url: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const speechRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const saved = { text: line.text, speech: line.speech === line.text ? '' : line.speech, reviewed: line.reviewed };
  const dirty = text !== saved.text || speech !== saved.speech || reviewed !== saved.reviewed;
  const spoken = (speech.trim() || text).trim();
  const coverage = nikudCoverage(text);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label); setMsg(null);
    try { await fn(); } catch (e) { setMsg({ kind: 'err', text: (e as Error).message }); }
    finally { setBusy(null); }
  };

  const save = () => run('save', async () => {
    await call('/api/lines', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: def.key, text: text === def.text ? null : text, speech: speech.trim() || null, reviewed }),
    });
    const next: Line = { ...line, text, speech: spoken, reviewed, edited: text !== def.text || Boolean(speech.trim()) };
    // generated audio belongs to the old wording
    if (audioSource === 'tts' && spoken !== line.speech) { next.audioUrl = null; next.audioSource = null; setAudioUrl(null); setAudioSource(null); }
    onSaved(next);
    setMsg({ kind: 'ok', text: 'נשמר.' + (audioSource && audioSource !== 'tts' && spoken !== line.speech ? ' שימו לב: ההקלטה הקיימת נעשתה לנוסח הקודם.' : '') });
  });

  const reset = () => run('reset', async () => {
    await call('/api/lines', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: def.key }) });
    setText(def.text); setSpeech(''); setShowSpeech(false); setReviewed(false); setAudioUrl(null); setAudioSource(null);
    onSaved({ ...line, text: def.text, speech: def.text, reviewed: false, edited: false, audioUrl: null, audioSource: null, audioStale: false });
    setMsg({ kind: 'ok', text: 'חזר לנוסח המקורי.' });
  });

  const autoNikud = (field: 'text' | 'speech') => run('nikud', async () => {
    const src = field === 'text' ? text : (speech || text);
    const r = await call('/api/nikud', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: stripNikud(src) }) });
    if (field === 'text') setSuggest(r.text);
    else { setSpeech(r.text); setShowSpeech(true); setMsg({ kind: 'info', text: 'הניקוד האוטומטי הוכנס לטקסט ההקראה. כדאי לעבור עליו ולשמור.' }); }
  });

  const listenDevice = () => { narrator.unlock(); void narrator.say({ text, speech: spoken }, { local: true }); };
  const listenCloud = () => run('cloud', async () => {
    const res = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: spoken }) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `שגיאה ${res.status}`); }
    const url = (res.headers.get('content-type') || '').includes('json') ? (await res.json()).url : URL.createObjectURL(await res.blob());
    await new Audio(url).play();
  });

  const upload = (blob: Blob, source: 'recorded' | 'uploaded') => run('upload', async () => {
    if (dirty) throw new Error('קודם שומרים את הנוסח, ואז מקליטים לו קול.');
    const fd = new FormData();
    fd.append('key', def.key); fd.append('source', source);
    fd.append('file', blob, source === 'recorded' ? 'recording' : (blob as File).name || 'audio');
    const r = await call('/api/audio', { method: 'POST', body: fd });
    setAudioUrl(r.url); setAudioSource(source); setRecording(null);
    onSaved({ ...line, audioUrl: r.url, audioSource: source, audioStale: false });
    setMsg({ kind: 'ok', text: 'ההקלטה נשמרה. מעכשיו הקריין ישמיע אותה.' });
  });

  const generate = () => run('gen', async () => {
    if (dirty) throw new Error('קודם שומרים את הנוסח.');
    const r = await call('/api/audio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: def.key }) });
    setAudioUrl(r.url); setAudioSource('tts');
    onSaved({ ...line, audioUrl: r.url, audioSource: 'tts', audioStale: false });
    setMsg({ kind: 'ok', text: 'נוצרה הקראה בקול הענן ונשמרה.' });
  });

  const removeAudio = () => run('rm', async () => {
    await call('/api/audio', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: def.key }) });
    setAudioUrl(null); setAudioSource(null);
    onSaved({ ...line, audioUrl: null, audioSource: null, audioStale: false });
  });

  const sourceLabel = audioSource === 'recorded' ? 'הקלטה שלכם' : audioSource === 'uploaded' ? 'קובץ שהועלה' : audioSource === 'tts' ? 'קול ענן (שמור)' : '';

  return (
    <article className={s.card} id={`line-${def.key}`}>
      <header className={s.cardHead}>
        <div>
          <div className={s.label}>{def.label}</div>
          <code className={s.key}>{def.key}</code>
        </div>
        <div className={s.chips}>
          <span className={`${s.chip} ${coverage > 0.6 ? s.chipOk : hasNikud(text) ? s.chipWarn : ''}`} title="כמה מהאותיות מנוקדות">
            ניקוד {Math.round(coverage * 100)}%
          </span>
          {line.edited && <span className={s.chip}>נערך</span>}
          {reviewed && <span className={`${s.chip} ${s.chipOk}`}>נבדק</span>}
          {audioUrl && <span className={`${s.chip} ${s.chipOk}`}>{sourceLabel}</span>}
          {line.audioStale && !audioUrl && <span className={`${s.chip} ${s.chipWarn}`}>הקלטה ישנה</span>}
        </div>
      </header>

      <label className={s.fieldLabel} htmlFor={`t-${def.key}`}>הטקסט שמופיע על המסך</label>
      <textarea id={`t-${def.key}`} ref={textRef} className={s.textarea} dir="rtl" value={text}
        rows={Math.min(8, Math.max(2, Math.ceil(text.length / 60)))} onChange={e => setText(e.target.value)} />
      <NikudPad target={textRef} onChange={setText} />

      {suggest !== null && (
        <div className={s.suggest}>
          <div className={s.fieldLabel}>הצעת ניקוד אוטומטי (כדאי לבדוק מילה-מילה):</div>
          <p className={s.suggestText} dir="rtl">{suggest}</p>
          <div className={s.actions}>
            <button type="button" className={s.btnMain} onClick={() => { setText(suggest); setSuggest(null); }}>להשתמש בהצעה</button>
            <button type="button" className={s.btn} onClick={() => setSuggest(null)}>לבטל</button>
          </div>
        </div>
      )}

      <div className={s.actions}>
        <button type="button" className={s.btn} onClick={() => autoNikud('text')} disabled={!!busy}>{busy === 'nikud' ? 'מנקד…' : 'ניקוד אוטומטי'}</button>
        <button type="button" className={s.btn} onClick={() => setText(stripNikud(text))} disabled={!hasNikud(text)}>הסרת ניקוד</button>
        <button type="button" className={s.btn} onClick={() => setShowSpeech(v => !v)}>{showSpeech ? 'הסתרת טקסט ההקראה' : 'טקסט נפרד להקראה'}</button>
        {text !== def.text && <button type="button" className={s.btnGhost} onClick={() => setText(def.text)}>הנוסח המקורי</button>}
      </div>

      {showSpeech && (
        <div className={s.speechBox}>
          <label className={s.fieldLabel} htmlFor={`s-${def.key}`}>
            מה הקריין אומר (אם ריק, הוא מקריא את הטקסט שעל המסך). כאן אפשר לכתוב כתיב מלא או ניקוד מדויק כדי לתקן הגייה.
          </label>
          <textarea id={`s-${def.key}`} ref={speechRef} className={s.textarea} dir="rtl" value={speech}
            placeholder={text} rows={2} onChange={e => setSpeech(e.target.value)} />
          <NikudPad target={speechRef} onChange={setSpeech} />
          <div className={s.actions}>
            <button type="button" className={s.btn} onClick={() => autoNikud('speech')} disabled={!!busy}>ניקוד אוטומטי לטקסט ההקראה</button>
            <button type="button" className={s.btnGhost} onClick={() => setSpeech(text)}>להעתיק מהטקסט שעל המסך</button>
          </div>
        </div>
      )}

      <div className={s.listen}>
        <span className={s.fieldLabel}>האזנה:</span>
        <button type="button" className={s.btn} onClick={listenDevice}>▶ קול המכשיר{narrator.hasDeviceVoice ? '' : ' (אין קול עברי במכשיר)'}</button>
        {status.tts && <button type="button" className={s.btn} onClick={listenCloud} disabled={!!busy}>{busy === 'cloud' ? 'טוען…' : `▶ קול ענן (${status.tts})`}</button>}
        {audioUrl && <audio className={s.audio} controls src={audioUrl} preload="none" />}
      </div>

      <div className={s.listen}>
        <span className={s.fieldLabel}>הקראה קבועה:</span>
        <Recorder disabled={!status.supabase || !!busy} onRecorded={blob => setRecording({ blob, url: URL.createObjectURL(blob) })} />
        <button type="button" className={s.btn} onClick={() => fileRef.current?.click()} disabled={!status.supabase || !!busy}>העלאת קובץ שמע</button>
        <input ref={fileRef} type="file" accept="audio/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) upload(f, 'uploaded'); e.target.value = ''; }} />
        {status.tts && <button type="button" className={s.btn} onClick={generate} disabled={!status.supabase || !!busy}>{busy === 'gen' ? 'יוצר…' : 'ליצור ולשמור בקול ענן'}</button>}
        {audioUrl && <button type="button" className={s.btnGhost} onClick={removeAudio} disabled={!!busy}>מחיקת השמע</button>}
      </div>
      {recording && (
        <div className={s.suggest}>
          <audio controls src={recording.url} className={s.audio} />
          <div className={s.actions}>
            <button type="button" className={s.btnMain} onClick={() => upload(recording.blob, 'recorded')} disabled={!!busy}>לשמור את ההקלטה</button>
            <button type="button" className={s.btn} onClick={() => setRecording(null)}>להקליט מחדש</button>
          </div>
        </div>
      )}

      <footer className={s.cardFoot}>
        <label className={s.check}>
          <input id={`r-${def.key}`} type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} />
          בדקתי את הניקוד וההגייה
        </label>
        <div className={s.actions}>
          {line.edited && <button type="button" className={s.btnGhost} onClick={reset} disabled={!!busy}>חזרה לנוסח המקורי</button>}
          <button type="button" className={s.btnMain} onClick={save} disabled={!dirty || !!busy || !status.supabase}>
            {busy === 'save' ? 'שומר…' : dirty ? 'שמירה' : 'שמור'}
          </button>
        </div>
      </footer>
      {msg && <p className={msg.kind === 'err' ? s.err : msg.kind === 'ok' ? s.ok : s.info} role="status">{msg.text}</p>}
    </article>
  );
}
