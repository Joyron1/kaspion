import type { IconName } from '@/game/engine/types';

const S = { stroke: '#15223a', strokeWidth: 2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

export function HomeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5V21h-6v-6H9v6H3z" fill="#ff6b4a" {...S} /></svg>;
}
export function MapIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" fill="#ffd23f" {...S} /><path d="M9 4v14M15 6v14" {...S} fill="none" /></svg>;
}
export function PlayIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 4 6 12l11 8z" fill="#15223a" /></svg>;
}
export function PauseIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="#15223a" /><rect x="14" y="5" width="4" height="14" rx="1" fill="#15223a" /></svg>;
}
export function NextIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" fill="none" {...S} strokeWidth={3} /></svg>;
}
export function PrevIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" {...S} strokeWidth={3} /></svg>;
}
export function AgainIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12a7 7 0 1 0 2-5M5 4v4h4" fill="none" {...S} strokeWidth={2.6} /></svg>;
}
export function SoundIcon({ on }: { on: boolean }) {
  return on
    ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#ffd23f" {...S} /><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" {...S} /></svg>
    : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#d6dce4" {...S} /><path d="m16 9 5 6m0-6-5 6" {...S} /></svg>;
}
export function BookIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1z" fill="#fffaf0" {...S} /><path d="M12 6v14" {...S} /></svg>;
}
export function PenIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1-4L16 5l3 3L8 19z" fill="#ffd23f" {...S} /></svg>;
}
export function StarIcon({ size = 52 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true"><path d="m12 2.5 2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5-4.9-4.5 6.6-.8z" fill="#ffd23f" {...S} strokeWidth={1.8} /></svg>;
}
export function HandIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M13 5.5a2.5 2.5 0 0 1 5 0V15l6.5 1.6a3 3 0 0 1 2.2 3.5L25 28H12.5L6.3 20.2a2.4 2.4 0 0 1 3.4-3.3L13 19.5z" fill="#fffaf0" {...S} />
      <circle cx="15.5" cy="5" r="4.2" fill="none" stroke="#1f5fa8" strokeWidth="1.6" strokeDasharray="3 2.5" />
    </svg>
  );
}

/** Little collectible icons for the top bar. */
export function ItemIcon({ name }: { name: IconName }) {
  switch (name) {
    case 'bubble': return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#bfefff" {...S} /><circle cx="8.8" cy="8.8" r="2.2" fill="#fff" /></svg>;
    case 'shell': return <svg viewBox="0 0 24 24"><path d="M12 19 3.5 12a8.5 8.5 0 0 1 17 0z" fill="#ffb49a" {...S} /><path d="M12 19 7 8.5M12 19V4.5M12 19l5-10.5" stroke="#15223a" strokeWidth="1.5" /></svg>;
    case 'spark': return <svg viewBox="0 0 24 24"><path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z" fill="#ffe066" {...S} /></svg>;
    case 'fish': return <svg viewBox="0 0 24 24"><path d="M4 12c3-5 10-6 14-2l3-3v10l-3-3c-4 4-11 3-14-2z" fill="#dde6ee" {...S} /><circle cx="8" cy="11" r="1.4" fill="#15223a" /></svg>;
    case 'heart': return <svg viewBox="0 0 24 24"><path d="M12 20S3 14 3 8.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 9 2.5C21 14 12 20 12 20z" fill="#ff86c1" {...S} /></svg>;
    case 'pearl': return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#fff7fb" {...S} /><circle cx="9.5" cy="9.5" r="2" fill="#fff" /><circle cx="14" cy="14" r="3" fill="#ffd6ec" /></svg>;
    case 'food': return <svg viewBox="0 0 24 24"><path d="M12 4l7 4v8l-7 4-7-4V8z" fill="#9be46b" {...S} /></svg>;
    case 'star': return <svg viewBox="0 0 24 24"><path d="m12 2.5 2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5-4.9-4.5 6.6-.8z" fill="#ffd23f" {...S} /></svg>;
    case 'whale': return <svg viewBox="0 0 24 24"><path d="M3 13c0-4 4-6 9-6s8 3 8 6-4 5-9 5-8-2-8-5z" fill="#4a78e8" {...S} /><path d="M19 11l3-3v6z" fill="#4a78e8" {...S} /><circle cx="7" cy="12" r="1.2" fill="#15223a" /></svg>;
    case 'hoop': return <svg viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="5" ry="9" fill="none" stroke="#15223a" strokeWidth="4" /><ellipse cx="12" cy="12" rx="5" ry="9" fill="none" stroke="#ffd23f" strokeWidth="2" /></svg>;
    case 'tear': return <svg viewBox="0 0 24 24"><path d="M12 3c4 6 6 9 6 12a6 6 0 0 1-12 0c0-3 2-6 6-12z" fill="#8fdcff" {...S} /></svg>;
  }
}
