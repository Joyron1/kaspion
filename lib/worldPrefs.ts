'use client';

import { useSyncExternalStore } from 'react';
import type { GameKind } from './content/world';

// Journey settings kept on this device: how many tasks each game has, and the narrator's voice.
const KEY = 'kaspion-world-prefs-v1';
const EVT = 'kaspion-world-prefs';

export type VoiceChoice = 'auto' | 'cloud' | `device:${string}`;

export interface WorldPrefs {
  counts: Record<GameKind, number>;
  voice: VoiceChoice;
  rate: number;
}

export const COUNT_MIN = 1;
export const COUNT_MAX = 10;

export const DEFAULT_PREFS: WorldPrefs = {
  counts: { bubbles: 5, mom: 5, memory: 5, food: 5, pearls: 5, shadow: 5, puzzle: 5, song: 5, hide: 5, color: 5, count: 5, maze: 5, sort: 5 },
  voice: 'auto',
  rate: 0.9,
};

function parse(raw: string | null): WorldPrefs {
  try {
    const v = raw ? JSON.parse(raw) : {};
    const counts = { ...DEFAULT_PREFS.counts };
    for (const k of Object.keys(counts) as GameKind[]) {
      const n = Number(v?.counts?.[k]);
      if (Number.isFinite(n)) counts[k] = Math.min(COUNT_MAX, Math.max(COUNT_MIN, Math.round(n)));
    }
    const voice = typeof v?.voice === 'string' && (v.voice === 'auto' || v.voice === 'cloud' || v.voice.startsWith('device:')) ? v.voice : 'auto';
    const rate = Number.isFinite(Number(v?.rate)) ? Math.min(1.3, Math.max(0.6, Number(v.rate))) : DEFAULT_PREFS.rate;
    return { counts, voice, rate };
  } catch {
    return DEFAULT_PREFS;
  }
}

function read(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function readWorldPrefs(): WorldPrefs { return parse(read()); }

export function writeWorldPrefs(p: WorldPrefs) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage blocked */ }
  window.dispatchEvent(new Event(EVT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb);
  window.addEventListener('storage', cb);
  return () => { window.removeEventListener(EVT, cb); window.removeEventListener('storage', cb); };
}

/** The journey settings, re-rendering when they change. Defaults on the server. */
export function useWorldPrefs(): WorldPrefs {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  return parse(raw);
}
