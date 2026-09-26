'use client';

import { useSyncExternalStore } from 'react';

// Per-browser conveniences: which levels are done, and whether sound is off.
const PROGRESS = 'kaspion-progress-v1';
const MUTED = 'kaspion-muted';
const EVT = 'kaspion-storage';

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* storage blocked */ }
  window.dispatchEvent(new Event(EVT));
}
function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb);
  window.addEventListener('storage', cb);
  return () => { window.removeEventListener(EVT, cb); window.removeEventListener('storage', cb); };
}

function parseProgress(raw: string | null): Record<string, number> {
  try {
    const v = raw ? JSON.parse(raw) : {};
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

export function readProgress(): Record<string, number> { return parseProgress(read(PROGRESS)); }

export function markLevelDone(id: string, seconds: number) {
  const p = readProgress();
  p[id] = p[id] ? Math.min(p[id], seconds) : seconds;
  write(PROGRESS, JSON.stringify(p));
}

/** Finished levels, re-rendering when they change. Empty on the server. */
export function useProgress(): Record<string, number> {
  const raw = useSyncExternalStore(subscribe, () => read(PROGRESS), () => null);
  return parseProgress(raw);
}

export function readMuted(): boolean { return read(MUTED) === '1'; }
export function writeMuted(m: boolean) { write(MUTED, m ? '1' : '0'); }

/** Sound on/off, remembered per browser. Always "on" during server render. */
export function useMuted(): boolean {
  return useSyncExternalStore(subscribe, () => read(MUTED) === '1', () => false);
}
