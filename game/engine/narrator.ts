// The narrator: reads a line out loud using the best source available.
//   1. audio saved for that line (a parent's recording, an upload, or cached cloud voice)
//   2. the server's cloud voice, when one is configured
//   3. the device's own Hebrew voice
//   4. silence with a realistic duration, so read-along pages still advance
// It reports progress (0..1) so the read-along can highlight the current word.

import type { Line, Lines, NarratorSettings } from '@/lib/content/types';
import { DEFAULT_NARRATOR } from '@/lib/content/types';
import { stripNikud } from '@/lib/nikud';

export interface SpeakOptions {
  onProgress?: (fraction: number) => void;
  /** skip the cloud voice even when configured (quick UI praise) */
  local?: boolean;
}

type Source = 'audio' | 'cloud' | 'device' | 'silent';

const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

export function estimateSeconds(text: string, rate = 1) {
  const words = stripNikud(text).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1.2, (words * 0.46 + 0.4) / rate);
}

export class Narrator {
  lines: Lines;
  settings: NarratorSettings;
  cloud: boolean;
  muted = false;
  lastSource: Source = 'silent';
  private audio: HTMLAudioElement | null = null;
  private voice: SpeechSynthesisVoice | null = null;
  private token = 0;
  private cloudUrls = new Map<string, string>();
  private cloudFailed = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private finish: (() => void) | null = null;

  constructor(lines: Lines, opts: { settings?: NarratorSettings; cloud?: boolean } = {}) {
    this.lines = lines;
    this.settings = opts.settings ?? DEFAULT_NARRATOR;
    this.cloud = Boolean(opts.cloud);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const pick = () => {
        try {
          const vs = window.speechSynthesis.getVoices();
          this.voice = vs.find(v => /^(he|iw)/i.test(v.lang) && /google|natural|premium|enhanced/i.test(v.name))
            ?? vs.find(v => /^(he|iw)/i.test(v.lang)) ?? null;
        } catch { /* ignore */ }
      };
      pick();
      window.speechSynthesis.addEventListener?.('voiceschanged', pick);
    }
  }

  /** Must run inside a tap: lets phones play audio later without a tap. */
  unlock() {
    if (typeof window === 'undefined') return;
    if (!this.audio) this.audio = new Audio();
    const a = this.audio;
    a.src = SILENT_WAV;
    a.play().catch(() => {});
    try { window.speechSynthesis?.resume(); } catch { /* ignore */ }
  }

  get hasDeviceVoice() { return this.voice !== null; }
  get canSpeak() { return !this.muted; }

  text(key: string, fallback = ''): string { return this.lines[key]?.text ?? fallback; }
  line(key: string): Line | undefined { return this.lines[key]; }

  setMuted(m: boolean) { this.muted = m; if (m) this.stop(); }
  setSettings(v: NarratorSettings) { this.settings = v; }

  stop() {
    this.token++;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.audio) { this.audio.pause(); this.audio.onended = null; this.audio.ontimeupdate = null; }
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    const f = this.finish; this.finish = null; f?.();
  }

  /** Warm the cloud voice for lines that will be needed soon. */
  prefetch(keys: string[]) {
    if (!this.cloud || this.cloudFailed || !this.settings.preferCloud) return;
    for (const k of keys) {
      const l = this.lines[k];
      if (l && !l.audioUrl) void this.cloudUrl(l).catch(() => {});
    }
  }

  private async cloudUrl(l: Line): Promise<string | null> {
    const id = `${l.key}|${l.speech}`;
    const hit = this.cloudUrls.get(id);
    if (hit) return hit;
    const res = await fetch('/api/tts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: l.key }),
    });
    if (!res.ok) { if (res.status === 501) this.cloudFailed = true; return null; }
    let url: string;
    if ((res.headers.get('content-type') || '').includes('application/json')) {
      url = (await res.json()).url;
    } else {
      url = URL.createObjectURL(await res.blob());
    }
    this.cloudUrls.set(id, url);
    return url;
  }

  /** Speak a line by key (or a free text). Resolves when done or stopped. */
  async say(keyOrText: string | { text: string; speech?: string }, opts: SpeakOptions = {}): Promise<void> {
    this.stop();
    const my = ++this.token;
    const l: Line = typeof keyOrText === 'string'
      ? (this.lines[keyOrText] ?? { key: keyOrText, text: '', speech: '', audioUrl: null, audioSource: null, audioStale: false, edited: false, reviewed: false })
      : { key: '', text: keyOrText.text, speech: keyOrText.speech ?? keyOrText.text, audioUrl: null, audioSource: null, audioStale: false, edited: false, reviewed: false };
    if (!l.speech.trim()) return;

    if (this.muted) return this.silent(l, my, opts);

    let url = l.audioUrl;
    if (!url && l.key && this.cloud && !this.cloudFailed && this.settings.preferCloud && !opts.local) {
      try { url = await this.cloudUrl(l); } catch { url = null; }
      if (my !== this.token) return;
    }
    if (url) {
      const ok = await this.playUrl(url, my, opts);
      if (ok) { this.lastSource = l.audioUrl ? 'audio' : 'cloud'; return; }
      if (my !== this.token) return;
    }
    if (this.voice) { this.lastSource = 'device'; return this.speakDevice(l, my, opts); }
    this.lastSource = 'silent';
    return this.silent(l, my, opts);
  }

  private playUrl(url: string, my: number, opts: SpeakOptions): Promise<boolean> {
    if (!this.audio) this.audio = new Audio();
    const a = this.audio;
    return new Promise<boolean>(resolve => {
      let settled = false;
      const done = (ok: boolean) => {
        if (settled) return; settled = true;
        a.onended = null; a.onerror = null; a.ontimeupdate = null;
        if (this.finish === onStop) this.finish = null;
        resolve(ok);
      };
      const onStop = () => done(true);
      this.finish = onStop;
      a.onended = () => { opts.onProgress?.(1); done(true); };
      a.onerror = () => done(false);
      a.ontimeupdate = () => { if (a.duration > 0) opts.onProgress?.(a.currentTime / a.duration); };
      a.src = url;
      a.play().catch(() => done(false));
      if (my !== this.token) done(true);
    });
  }

  private speakDevice(l: Line, my: number, opts: SpeakOptions): Promise<void> {
    return new Promise<void>(resolve => {
      const u = new SpeechSynthesisUtterance(l.speech);
      u.voice = this.voice; u.lang = this.voice?.lang ?? 'he-IL';
      u.rate = this.settings.rate; u.pitch = this.settings.pitch;
      const total = l.speech.length || 1;
      const est = estimateSeconds(l.speech, this.settings.rate) * 1000;
      const start = performance.now();
      let boundary = false;
      const finish = () => {
        if (this.timer) { clearInterval(this.timer); this.timer = null; }
        if (this.finish === finish) this.finish = null;
        opts.onProgress?.(1);
        resolve();
      };
      this.finish = finish;
      u.onboundary = e => { boundary = true; opts.onProgress?.(Math.min(0.99, e.charIndex / total)); };
      u.onend = finish;
      u.onerror = finish;
      // Some Hebrew voices send no word events: fall back to a clock.
      this.timer = setInterval(() => {
        if (my !== this.token) return;
        if (!boundary) opts.onProgress?.(Math.min(0.99, (performance.now() - start) / est));
      }, 120);
      try { window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch { finish(); }
    });
  }

  private silent(l: Line, my: number, opts: SpeakOptions): Promise<void> {
    const est = estimateSeconds(l.speech, this.settings.rate) * 1000;
    const start = performance.now();
    return new Promise<void>(resolve => {
      const finish = () => {
        if (this.timer) { clearInterval(this.timer); this.timer = null; }
        if (this.finish === finish) this.finish = null;
        resolve();
      };
      this.finish = finish;
      this.timer = setInterval(() => {
        if (my !== this.token) return finish();
        const f = (performance.now() - start) / est;
        opts.onProgress?.(Math.min(1, f));
        if (f >= 1) finish();
      }, 100);
    });
  }
}
