'use client';

import { useSyncExternalStore } from 'react';

// Per-browser conveniences: which levels are done, and whether sound is off.
const PROGRESS = 'kaspion-progress-v1';
const MUTED = 'kaspion-muted';
const WORLD = 'kaspion-world-v1';
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

// ---- the 3D journey: which stations are done
export function readWorld(): number[] {
  try {
    const v = JSON.parse(read(WORLD) ?? '[]');
    return Array.isArray(v) ? v.filter(n => typeof n === 'number') : [];
  } catch {
    return [];
  }
}
export function markStationDone(i: number) {
  const done = readWorld();
  if (!done.includes(i)) write(WORLD, JSON.stringify([...done, i].sort((a, b) => a - b)));
}
export function resetWorld() { write(WORLD, '[]'); write(FOOD, '0'); }

// snacks Kaspion gathered for the way (the food station fills it, later stations eat from it)
const FOOD = 'kaspion-world-food';
export function readFood(): number { const n = Number(read(FOOD)); return Number.isFinite(n) ? Math.max(0, n) : 0; }
export function writeFood(n: number) { write(FOOD, String(Math.max(0, Math.round(n)))); }

/** Finished journey stations, re-rendering when they change. Empty on the server. */
export function useWorldProgress(): number[] {
  const raw = useSyncExternalStore(subscribe, () => read(WORLD), () => null);
  try {
    const v = JSON.parse(raw ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
