// Tiny synthesized sound effects (no audio files to load).

type AC = AudioContext;

let actx: AC | null = null;
let muted = false;

export function unlockAudio() {
  if (typeof window === 'undefined') return;
  if (!actx) {
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      actx = new Ctor();
    } catch { /* no audio */ }
  }
  if (actx && actx.state === 'suspended') void actx.resume();
}

export function setSfxMuted(m: boolean) {
  muted = m;
  if (amb && actx) amb.gain.setTargetAtTime(m ? 0 : AMB_VOL, actx.currentTime, 0.3);
}

// ---- a soft underwater bed for the 3D journey: deep filtered noise that swells slowly
const AMB_VOL = 0.07;
let amb: GainNode | null = null;
let ambStop: (() => void) | null = null;

export function startAmbience() {
  if (!actx || amb) return;
  const a = actx;
  const len = a.sampleRate * 4;
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
  const src = a.createBufferSource();
  src.buffer = buf; src.loop = true;
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.7;
  const lfo = a.createOscillator(), lfoGain = a.createGain();
  lfo.frequency.value = 0.08; lfoGain.gain.value = 180;
  lfo.connect(lfoGain).connect(lp.frequency);
  amb = a.createGain();
  amb.gain.value = 0;
  amb.gain.setTargetAtTime(muted ? 0 : AMB_VOL, a.currentTime, 1.5);
  src.connect(lp).connect(amb).connect(a.destination);
  src.start(); lfo.start();
  // now and then a little bubble
  const bubbles = setInterval(() => { if (!muted && Math.random() < 0.5) tone(500 + Math.random() * 500, 1400 + Math.random() * 600, 0.09, 'sine', 0.025); }, 1600);
  ambStop = () => { clearInterval(bubbles); try { src.stop(); lfo.stop(); } catch { /* already stopped */ } };
}

export function stopAmbience() {
  ambStop?.();
  ambStop = null;
  amb?.disconnect();
  amb = null;
}

function tone(f1: number, f2: number, dur: number, type: OscillatorType = 'sine', vol = 0.18, delay = 0) {
  if (muted || !actx) return;
  const t0 = actx.currentTime + delay;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f1, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(actx.destination);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

/** One soft musical note (shell song). */
export function note(freq: number, dur = 0.45) {
  tone(freq, freq, dur, 'sine', 0.2);
  tone(freq * 2, freq * 2, dur * 0.7, 'triangle', 0.05);
}

export const sfx = {
  munch() { [520, 380, 520].forEach((f, i) => tone(f, f * 0.8, 0.07, 'square', 0.06, i * 0.09)); },
  tap() { tone(900, 700, 0.06, 'sine', 0.05); },
  pop() { tone(420, 1300, 0.14, 'sine', 0.22); },
  shell() { tone(700, 1400, 0.12, 'sine', 0.16); tone(1050, 2100, 0.14, 'sine', 0.1, 0.08); },
  bonk() { tone(260, 90, 0.3, 'triangle', 0.25); },
  sparkle() { [988, 1319, 1760].forEach((f, i) => tone(f, f * 1.01, 0.16, 'sine', 0.12, i * 0.08)); },
  join() { tone(520, 780, 0.12, 'triangle', 0.14); tone(780, 1040, 0.12, 'triangle', 0.1, 0.1); },
  stage() { [659, 784, 988].forEach((f, i) => tone(f, f, 0.2, 'triangle', 0.14, i * 0.1)); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.24, 'triangle', 0.16, i * 0.13)); },
  whale() { tone(170, 110, 1.4, 'sine', 0.22); tone(230, 150, 1.4, 'sine', 0.1, 0.35); },
  whaleHappy() { tone(200, 320, 0.9, 'sine', 0.2); tone(260, 420, 0.9, 'sine', 0.1, 0.25); },
  splash() { tone(300, 1200, 0.25, 'sawtooth', 0.05); tone(1400, 400, 0.3, 'sine', 0.08, 0.05); },
  whoosh() { tone(200, 600, 0.25, 'triangle', 0.08); },
  giggle() { [880, 990, 880, 1100].forEach((f, i) => tone(f, f * 1.1, 0.07, 'sine', 0.1, i * 0.07)); },
  call() { tone(600, 900, 0.18, 'square', 0.05); tone(900, 600, 0.18, 'square', 0.05, 0.2); },
};
export type SfxName = keyof typeof sfx;
