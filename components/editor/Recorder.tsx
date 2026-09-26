'use client';

import { useEffect, useRef, useState } from 'react';
import s from './editor.module.css';

interface Props { onRecorded: (blob: Blob) => void; disabled?: boolean }

/** Record the parent's own voice for a line with the device microphone. */
export default function Recorder({ onRecorded, disabled }: Props) {
  const [state, setState] = useState<'idle' | 'recording' | 'error'>('idle');
  const [secs, setSecs] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    rec.current?.stream.getTracks().forEach(t => t.stop());
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find(t => MediaRecorder.isTypeSupported(t));
      const r = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      chunks.current = [];
      r.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data); };
      r.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks.current, { type: r.mimeType.split(';')[0] || 'audio/webm' });
        if (blob.size > 0) onRecorded(blob);
      };
      r.start();
      rec.current = r;
      setSecs(0); setState('recording');
      timer.current = setInterval(() => setSecs(v => v + 1), 1000);
    } catch {
      setState('error');
    }
  };
  const stop = () => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    rec.current?.stop();
    rec.current = null;
    setState('idle');
  };

  return (
    <span className={s.recorder}>
      {state === 'recording'
        ? <button type="button" className={`${s.btn} ${s.rec}`} onClick={stop}>■ עצירה ({secs} שנ׳)</button>
        : <button type="button" className={s.btn} onClick={start} disabled={disabled}>● הקלטה בקול שלי</button>}
      {state === 'error' && <span className={s.err}>אין גישה למיקרופון. אפשר להעלות קובץ במקום.</span>}
    </span>
  );
}
