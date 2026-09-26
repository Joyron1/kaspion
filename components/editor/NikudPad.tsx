'use client';

import { MARKS, applyMark, clearLetter } from '@/lib/nikud';
import s from './editor.module.css';

interface Props {
  target: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
}

/** On-screen nikud keyboard: tap a letter in the text, then tap a mark. */
export default function NikudPad({ target, onChange }: Props) {
  const apply = (fn: (text: string, caret: number) => { text: string; caret: number }) => {
    const el = target.current;
    if (!el) return;
    const caret = el.selectionStart ?? el.value.length;
    const r = fn(el.value, caret);
    if (r.text === el.value) { el.focus(); return; }
    onChange(r.text);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(r.caret, r.caret); });
  };
  return (
    <div className={s.pad} role="toolbar" aria-label="מקלדת ניקוד">
      {MARKS.map(m => (
        <button
          key={m.ch}
          type="button"
          className={s.padKey}
          title={m.name}
          aria-label={m.name}
          onMouseDown={e => e.preventDefault()}
          onClick={() => apply((t, c) => applyMark(t, c, m.ch))}
        >
          <span className={s.padSample}>{m.sample}</span>
          <span className={s.padName}>{m.name}</span>
        </button>
      ))}
      <button type="button" className={s.padKey} title="מחיקת הניקוד מהאות" onMouseDown={e => e.preventDefault()} onClick={() => apply(clearLetter)}>
        <span className={s.padSample}>⌫</span>
        <span className={s.padName}>ניקוי אות</span>
      </button>
    </div>
  );
}
