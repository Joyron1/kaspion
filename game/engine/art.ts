// The drawing kit: thick ink outlines and flat bright fills, in the spirit of
// Paul Kor's picture books. Every function draws in world units on the given
// context; callers handle the camera.

import { TAU, clamp, easeOutBack, hash, mix } from './util';

type C = CanvasRenderingContext2D;

export const INK = '#15223a';
export const PAL = {
  silver: '#dde6ee', silverShade: '#a8bccf', scale: '#93a8bf',
  sand: '#f3cf73', sandDot: '#d9a94e',
  coral: '#ff6b4a', purple: '#b77cf0', orange: '#ffb13b', pink: '#ff86c1',
  green: '#3fbf6e', greenDark: '#2fa35a', sun: '#ffd23f', rock: '#8a7fae', rockLight: '#a79bd0',
  // In the book the whales are solid black; ours are a very dark navy so the ink outline still reads.
  whale: '#343d63', whaleDark: '#232a47', whaleBelly: '#7f8ab8',
  mama: '#3f4a78', papa: '#1f2540',
  mountain: '#4f5470', mountainDark: '#3b3f57',
  cheek: 'rgba(255,120,140,.45)', white: '#ffffff',
};

/** Stroke a path twice: a wide ink line under a narrower colored one. */
export function inkStroke(c: C, build: () => void, w: number, color: string) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  build();
  c.lineWidth = w + 7; c.strokeStyle = INK; c.stroke();
  c.lineWidth = w; c.strokeStyle = color; c.stroke();
}

function fillInk(c: C, fill: string, lw = 5) {
  c.fillStyle = fill; c.fill();
  c.lineWidth = lw; c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke();
}

// ---------------------------------------------------------------- backgrounds

/** Screen-space water: depth 0 = sunny shallows, 1 = the dark deep. */
export function sea(c: C, W: number, H: number, t: number, depth = 0, scroll = 0) {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, mix('#5ccbee', '#1d4f8f', depth));
  g.addColorStop(1, mix('#1f74c0', '#0b2250', depth));
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // Paul Kor paints the sea in long horizontal brush strokes
  for (let i = 0; i < 14; i++) {
    const y = (H * (i + 0.5)) / 14 + Math.sin(t * 0.35 + i * 1.7) * 4;
    const len = W * (0.35 + hash(i * 5.3) * 0.5);
    const x = ((hash(i * 2.9) * W * 1.4 - scroll * (0.15 + hash(i) * 0.1) + t * (4 + i % 3 * 3)) % (W * 1.4) + W * 1.4) % (W * 1.4) - W * 0.3;
    c.fillStyle = i % 3 === 0 ? `rgba(255,255,255,${0.06 - depth * 0.03})` : `rgba(10,40,110,${0.07 + depth * 0.05})`;
    c.beginPath();
    c.ellipse(x + len / 2, y, len / 2, 5 + hash(i * 7.7) * 7, 0, 0, TAU);
    c.fill();
  }
  c.fillStyle = `rgba(255,255,255,${0.05 * (1 - depth)})`;
  for (let i = 0; i < 6; i++) {
    const x = W * (i / 5) + Math.sin(t * 0.25 + i * 2) * 40 - 60 - (scroll * 0.2) % (W / 5);
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 70, 0);
    c.lineTo(x + 200, H * 0.85); c.lineTo(x + 90, H * 0.85); c.closePath(); c.fill();
  }
  c.fillStyle = `rgba(255,255,255,${0.35 - depth * 0.15})`;
  for (let i = 0; i < 26; i++) {
    const x = ((hash(i + 1) * W - scroll * 0.3) % W + W) % W + Math.sin(t + i) * 6;
    const y = H - ((t * (14 + hash(i + 7) * 20) + hash(i + 3) * H) % (H + 20));
    c.beginPath(); c.arc(x, y, 1.5 + hash(i + 5) * 2.5, 0, TAU); c.fill();
  }
}

/** Far hills for parallax, drawn in screen space with an offset. */
export function farHills(c: C, W: number, H: number, offset: number, color: string, seed = 1) {
  c.fillStyle = color;
  const step = 260;
  const first = Math.floor(offset / step) - 1;
  for (let i = first; i < first + W / step + 3; i++) {
    const x = i * step - offset;
    const w = 150 + hash(i * 3 + seed) * 120, h = 70 + hash(i * 7 + seed) * 90;
    c.beginPath(); c.ellipse(x, H - 30, w, h, 0, Math.PI, TAU); c.fill();
  }
}

/** Waterline with sky above it, for scenes at the surface. y is the water level. */
export function surface(c: C, x0: number, x1: number, y: number, t: number, top = y - 400) {
  const g = c.createLinearGradient(0, top, 0, y);
  g.addColorStop(0, '#9fe3ff'); g.addColorStop(1, '#e6f8ff');
  c.fillStyle = g; c.fillRect(x0, top, x1 - x0, y - top + 2);
  // sun
  c.beginPath(); c.arc(x0 + (x1 - x0) * 0.82, top + (y - top) * 0.35, 38, 0, TAU); fillInk(c, PAL.sun, 4);
  // waves
  c.beginPath(); c.moveTo(x0, y + 30);
  for (let x = x0; x <= x1 + 20; x += 20) c.lineTo(x, y + Math.sin(x * 0.05 + t * 2) * 5);
  c.lineTo(x1 + 20, y + 30); c.closePath();
  c.fillStyle = 'rgba(92,203,238,0.9)'; c.fill();
  c.beginPath();
  for (let x = x0; x <= x1 + 20; x += 20) c.lineTo(x, y + Math.sin(x * 0.05 + t * 2) * 5);
  c.lineWidth = 4; c.strokeStyle = INK; c.stroke();
}

export function sandY(x: number, base: number) {
  return base + Math.sin(x * 0.018) * 6 + Math.sin(x * 0.047) * 3;
}

/** Sea floor from x0 to x1; base is the sand line (world y). */
export function sand(c: C, x0: number, x1: number, base: number, color = PAL.sand) {
  c.beginPath(); c.moveTo(x0, base + 400);
  for (let x = x0; x <= x1 + 20; x += 20) c.lineTo(x, sandY(x, base));
  c.lineTo(x1 + 20, base + 400); c.closePath();
  c.fillStyle = color; c.fill();
  c.beginPath();
  for (let x = x0; x <= x1 + 20; x += 20) c.lineTo(x, sandY(x, base));
  c.lineWidth = 4; c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke();
  c.fillStyle = PAL.sandDot;
  for (let x = Math.floor(x0 / 70) * 70; x < x1 + 70; x += 70) {
    const h = hash(x);
    c.beginPath(); c.ellipse(x + h * 40, base + 20 + h * 16, 5 + h * 4, 3 + h * 2, 0, 0, TAU); c.fill();
  }
}

// ---------------------------------------------------------------- scenery

export function weed(c: C, x: number, base: number, h: number, color: string, phase: number, t: number) {
  inkStroke(c, () => {
    c.beginPath(); c.moveTo(x, base);
    for (let i = 1; i <= 6; i++) c.lineTo(x + Math.sin(t * 1.6 + phase + i * 0.7) * i * 3, base - (h * i) / 6);
  }, 9, color);
}

export function coral(c: C, x: number, base: number, s: number, color: string) {
  inkStroke(c, () => {
    c.beginPath();
    c.moveTo(x, base); c.lineTo(x, base - s);
    c.moveTo(x, base - s * 0.45); c.lineTo(x - s * 0.38, base - s * 0.8); c.lineTo(x - s * 0.45, base - s * 1.05);
    c.moveTo(x, base - s * 0.6); c.lineTo(x + s * 0.36, base - s * 0.95);
    c.moveTo(x - s * 0.38, base - s * 0.8); c.lineTo(x - s * 0.15, base - s * 1.1);
  }, s * 0.17, color);
}

export function rock(c: C, x: number, base: number, s: number, color = PAL.rock) {
  c.beginPath(); c.ellipse(x, base + 4, s, s * 0.6, 0, Math.PI, TAU); c.closePath();
  fillInk(c, color, 4);
  c.fillStyle = 'rgba(255,255,255,.22)';
  c.beginPath(); c.ellipse(x - s * 0.3, base - s * 0.3, s * 0.22, s * 0.1, -0.3, 0, TAU); c.fill();
}

/** A rock arch / cave mouth that something can hide in. */
export function cave(c: C, x: number, base: number, w: number, h: number) {
  c.beginPath();
  c.moveTo(x - w / 2, base + 6);
  c.bezierCurveTo(x - w / 2, base - h * 1.3, x + w / 2, base - h * 1.3, x + w / 2, base + 6);
  c.closePath(); fillInk(c, PAL.rock, 5);
  c.beginPath(); c.ellipse(x, base + 4, w * 0.28, h * 0.55, 0, Math.PI, TAU); c.closePath();
  c.fillStyle = '#2a2350'; c.fill(); c.lineWidth = 4; c.strokeStyle = INK; c.stroke();
}

export function anemone(c: C, x: number, base: number, s: number, color: string, t: number) {
  for (let i = -3; i <= 3; i++) {
    inkStroke(c, () => {
      c.beginPath(); c.moveTo(x + i * s * 0.08, base);
      c.quadraticCurveTo(x + i * s * 0.2 + Math.sin(t * 2 + i) * 4, base - s * 0.5, x + i * s * 0.28 + Math.sin(t * 2 + i) * 6, base - s * (0.8 + Math.abs(i) * -0.06));
    }, s * 0.07, color);
  }
}

// ---------------------------------------------------------------- characters

export type Mood = 'happy' | 'sad' | 'ouch' | 'surprised' | 'sleepy';

export interface FishOpts {
  body?: string; fin?: string; scale?: string;
  fast?: boolean; mood?: Mood;
  lashes?: boolean; // Kaspion's mother
  bow?: string;     // a tiny bow, to tell one cousin from another
  blink?: boolean;
  shine?: boolean;  // silver glint (default on)
}

/**
 * Kaspion and every silver fish of his family. Drawn in a 100-unit box facing
 * right; face = 1 right, -1 left. size = length in world units.
 */
export function fish(c: C, x: number, y: number, size: number, face: number, t: number, o: FishOpts = {}) {
  const body = o.body ?? PAL.silver, finC = o.fin ?? PAL.silverShade;
  c.save(); c.translate(x, y); c.scale((face >= 0 ? 1 : -1) * size / 100, size / 100);
  c.lineJoin = 'round'; c.lineCap = 'round';
  const wag = Math.sin(t * (o.fast ? 15 : 7)) * 0.28;
  // tail
  c.save(); c.translate(-34, 0); c.rotate(wag);
  c.beginPath(); c.moveTo(6, 0); c.lineTo(-24, -22); c.quadraticCurveTo(-15, 0, -24, 22); c.closePath();
  fillInk(c, finC);
  c.restore();
  // top fin
  c.beginPath(); c.moveTo(-16, -20); c.quadraticCurveTo(-6, -40, 12, -23); c.closePath(); fillInk(c, finC);
  // body with shine and scales
  const shape = () => { c.beginPath(); c.ellipse(0, 0, 40, 26, 0, 0, TAU); };
  shape(); c.fillStyle = body; c.fill();
  c.save(); shape(); c.clip();
  c.fillStyle = 'rgba(255,255,255,.75)';
  c.beginPath(); c.ellipse(6, -13, 30, 7, -0.08, 0, TAU); c.fill();
  c.strokeStyle = o.scale ?? PAL.scale; c.lineWidth = 2.6;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    c.beginPath(); c.arc(-22 + i * 12 + (j % 2) * 6, -6 + j * 10, 5.5, -Math.PI / 2, Math.PI / 2); c.stroke();
  }
  c.restore();
  shape(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
  // the silver glint that gives Kaspion his name
  if (o.shine !== false) {
    const k = (Math.sin(t * 2.2 + x * 0.01) + 1) / 2;
    const gx = -24 + ((t * 18 + x * 0.3) % 48);
    c.save(); c.globalAlpha = 0.35 + k * 0.65;
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4, rr = i % 2 ? 1.6 : 5.5 + k * 2;
      c.lineTo(gx + Math.cos(a) * rr, -10 + Math.sin(a) * rr);
    }
    c.closePath(); c.fillStyle = '#ffffff'; c.fill();
    c.restore();
  }
  // side fin
  c.save(); c.translate(-2, 8); c.rotate(0.5 + wag * 0.8);
  c.beginPath(); c.ellipse(-8, 0, 11, 5.5, 0, 0, TAU); c.fillStyle = finC; c.fill(); c.lineWidth = 3.5; c.stroke();
  c.restore();
  // eye
  const mood = o.mood ?? 'happy';
  const closed = o.blink || mood === 'sleepy';
  if (closed) {
    c.beginPath(); c.arc(20, -6, 7, 0.1 * Math.PI, 0.9 * Math.PI); c.lineWidth = 3.5; c.stroke();
  } else {
    const er = mood === 'surprised' ? 11 : 9.5;
    c.beginPath(); c.arc(20, -6, er, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 3.5; c.stroke();
    c.beginPath(); c.arc(22.5, -5.5, mood === 'surprised' ? 4 : 5, 0, TAU); c.fillStyle = INK; c.fill();
    c.beginPath(); c.arc(24, -7.5, 1.8, 0, TAU); c.fillStyle = '#fff'; c.fill();
  }
  if (o.lashes) {
    c.lineWidth = 2.5; c.strokeStyle = INK;
    for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(16 + k * 5, -15); c.lineTo(14 + k * 6, -21); c.stroke(); }
  }
  if (mood === 'sad') {
    c.beginPath(); c.moveTo(12, -19); c.lineTo(26, -15); c.lineWidth = 3; c.stroke();
  }
  // mouth
  c.beginPath();
  if (mood === 'ouch' || mood === 'surprised') c.arc(34, 8, 3.5, 0, TAU);
  else if (mood === 'sad') { c.moveTo(29, 11); c.quadraticCurveTo(34, 6, 38.5, 10); }
  else { c.moveTo(29, 8); c.quadraticCurveTo(34, 13, 38.5, 7); }
  c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
  c.fillStyle = PAL.cheek; c.beginPath(); c.ellipse(16, 8, 5, 3, 0, 0, TAU); c.fill();
  if (o.bow) {
    c.save(); c.translate(-4, -26);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(-9, -6); c.lineTo(-9, 6); c.closePath(); fillInk(c, o.bow, 2.5);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(9, -6); c.lineTo(9, 6); c.closePath(); fillInk(c, o.bow, 2.5);
    c.restore();
  }
  c.restore();
}

export interface WhaleOpts {
  body?: string; dark?: string; belly?: string;
  mood?: Mood;
  rock?: number;   // 0..1: how much he still looks like a grey mountain
  tail?: number;   // 0..1: tail revealed (pop-out animation)
  fin?: number;    // 0..1: flipper revealed
  eye?: number;    // 0..1: eye opened
  spout?: number;  // 0..1: water spout strength
  lashes?: boolean;
  smile?: boolean;
}

/**
 * A whale drawn around (x, y) with body radius R. face = -1 faces left (the
 * default drawing), face = 1 faces right. All reveal values default to 1, so a
 * plain call draws a finished whale; the mountain scene animates them from 0.
 */
export function whale(c: C, x: number, y: number, R: number, face: number, t: number, o: WhaleOpts = {}) {
  const m = 1 - (o.rock ?? 0);
  const body = mix(PAL.mountain, o.body ?? PAL.whale, m);
  const dark = mix(PAL.mountainDark, o.dark ?? PAL.whaleDark, m);
  const tailK = o.tail ?? 1, finK = o.fin ?? 1, eyeK = o.eye ?? 1;
  c.save(); c.translate(x, y); if (face > 0) c.scale(-1, 1);
  c.lineJoin = 'round'; c.lineCap = 'round';
  // tail
  if (tailK > 0) {
    const k = easeOutBack(clamp(tailK, 0, 1));
    c.save(); c.translate(R * 0.75, -R * 0.1); c.rotate(Math.sin(t * 2) * 0.1); c.scale(k, k);
    inkStroke(c, () => { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(R * 0.25, -R * 0.02, R * 0.36, -R * 0.3); }, R * 0.16, body);
    for (const s of [-1, 1]) {
      c.beginPath(); c.ellipse(R * 0.36 + s * R * 0.13, -R * 0.37, R * 0.15, R * 0.06, -s * 0.35, 0, TAU);
      fillInk(c, body);
    }
    c.restore();
  }
  // body
  const shape = () => { c.beginPath(); c.ellipse(0, 0, R, R * 0.58, 0, 0, TAU); };
  shape(); c.fillStyle = body; c.fill();
  c.save(); shape(); c.clip();
  if (m > 0) {
    c.globalAlpha = m; c.fillStyle = o.belly ?? PAL.whaleBelly;
    c.beginPath(); c.ellipse(-R * 0.3, R * 0.5, R * 0.8, R * 0.3, 0, 0, TAU); c.fill();
    c.strokeStyle = '#a9c2ee'; c.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      c.beginPath(); c.moveTo(-R * 0.95, R * (0.3 + i * 0.07));
      c.quadraticCurveTo(-R * 0.3, R * (0.36 + i * 0.07), R * 0.3, R * (0.36 + i * 0.06)); c.stroke();
    }
  }
  if (m < 1) {
    c.globalAlpha = 1 - m; c.fillStyle = dark;
    for (const [px, py, pr] of [[-0.5, -0.3, 0.12], [0.1, -0.42, 0.09], [0.45, -0.12, 0.14], [-0.2, 0.02, 0.1], [0.3, 0.22, 0.08], [-0.78, 0.14, 0.07]]) {
      c.beginPath(); c.arc(px * R, py * R, pr * R, 0, TAU); c.fill();
    }
    c.strokeStyle = INK; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-R * 0.3, -R * 0.55); c.lineTo(-R * 0.24, -R * 0.38); c.lineTo(-R * 0.32, -R * 0.26);
    c.moveTo(R * 0.62, -R * 0.38); c.lineTo(R * 0.55, -R * 0.24); c.stroke();
  }
  c.restore();
  shape(); c.lineWidth = 6; c.strokeStyle = INK; c.stroke();
  // plants that grew on the "mountain"
  if (m < 1) {
    c.globalAlpha = 1 - m;
    for (const [px, h] of [[-0.35, 0.2], [-0.28, 0.13], [0.2, 0.16], [0.5, 0.12]]) {
      const px2 = px * R, py2 = -R * 0.58 * Math.sqrt(1 - px * px) + 3;
      inkStroke(c, () => { c.beginPath(); c.moveTo(px2, py2); c.lineTo(px2 + Math.sin(t * 1.5 + px * 9) * 5, py2 - h * R); }, 7, PAL.green);
    }
    c.globalAlpha = 1;
  }
  // flipper
  if (finK > 0) {
    const k = easeOutBack(clamp(finK, 0, 1));
    c.save(); c.translate(-R * 0.1, R * 0.2); c.rotate(0.5 + Math.sin(t * 3) * 0.2); c.scale(k, k);
    c.beginPath(); c.ellipse(R * 0.13, 0, R * 0.17, R * 0.07, 0, 0, TAU); fillInk(c, dark);
    c.restore();
  }
  // eye
  if (eyeK > 0) {
    const k = easeOutBack(clamp(eyeK, 0, 1));
    c.save(); c.translate(-R * 0.6, -R * 0.1); c.scale(k, k);
    if (o.mood === 'sleepy') {
      c.beginPath(); c.arc(0, 0, R * 0.08, 0.1 * Math.PI, 0.9 * Math.PI); c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
    } else {
      c.beginPath(); c.arc(0, 0, R * 0.09, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 4; c.strokeStyle = INK; c.stroke();
      c.beginPath(); c.arc(-R * 0.02, R * 0.015, R * 0.048, 0, TAU); c.fillStyle = INK; c.fill();
      c.beginPath(); c.arc(-R * 0.005, -R * 0.01, R * 0.016, 0, TAU); c.fillStyle = '#fff'; c.fill();
    }
    if (o.mood === 'sad') {
      c.beginPath(); c.moveTo(-R * 0.1, -R * 0.17); c.lineTo(R * 0.07, -R * 0.12); c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
    }
    if (o.lashes) {
      c.lineWidth = 3.5; c.strokeStyle = INK;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-R * 0.06 + i * R * 0.05, -R * 0.085); c.lineTo(-R * 0.09 + i * R * 0.06, -R * 0.15); c.stroke(); }
    }
    c.restore();
  }
  // mouth and cheek once he is a whale
  if (m > 0) {
    c.globalAlpha = m;
    c.beginPath();
    if (o.smile || o.mood === 'happy') { c.moveTo(-R * 0.95, R * 0.1); c.quadraticCurveTo(-R * 0.78, R * 0.24, -R * 0.6, R * 0.12); }
    else { c.moveTo(-R * 0.95, R * 0.14); c.quadraticCurveTo(-R * 0.8, R * 0.06, -R * 0.62, R * 0.15); }
    c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
    c.fillStyle = 'rgba(255,130,160,.5)';
    c.beginPath(); c.ellipse(-R * 0.48, R * 0.04, R * 0.06, R * 0.03, 0, 0, TAU); c.fill();
    c.globalAlpha = 1;
  }
  // spout from the blowhole
  if ((o.spout ?? 0) > 0) {
    const s = o.spout!;
    c.save(); c.translate(-R * 0.35, -R * 0.56);
    for (let i = -2; i <= 2; i++) {
      inkStroke(c, () => {
        c.beginPath(); c.moveTo(0, 0);
        c.quadraticCurveTo(i * R * 0.05, -R * 0.45 * s, i * R * 0.16 * s, -R * (0.32 + Math.abs(i) * -0.05) * s + Math.sin(t * 8 + i) * 3);
      }, R * 0.035, '#bfefff');
    }
    c.restore();
  }
  c.restore();
}

export function jelly(c: C, x: number, y: number, t: number, squish = 0, phase = 0, color = PAL.pink) {
  const s = 1 + squish * 0.3;
  c.save(); c.translate(x, y); c.scale(s, 1 / s);
  for (let i = -2; i <= 2; i++) {
    inkStroke(c, () => {
      c.beginPath(); c.moveTo(i * 10, 6);
      for (let k = 1; k <= 4; k++) c.lineTo(i * 10 + Math.sin(t * 3 + phase + k + i) * 5, 6 + k * 12);
    }, 4, '#ffc0de');
  }
  c.beginPath(); c.moveTo(-32, 8); c.bezierCurveTo(-34, -38, 34, -38, 32, 8);
  c.quadraticCurveTo(0, 1, -32, 8); c.closePath(); fillInk(c, color, 4);
  c.fillStyle = 'rgba(255,255,255,.55)';
  c.beginPath(); c.ellipse(-12, -18, 9, 4, -0.5, 0, TAU); c.fill();
  c.fillStyle = INK;
  c.beginPath(); c.arc(-9, -6, 3.3, 0, TAU); c.arc(9, -6, 3.3, 0, TAU); c.fill();
  c.beginPath(); c.arc(0, -1, 3, 0, Math.PI); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
  c.restore();
}

export function crab(c: C, x: number, y: number, s: number, t: number, color = '#ff5a3c') {
  c.save(); c.translate(x, y); c.scale(s / 60, s / 60);
  const w = Math.sin(t * 6) * 0.2;
  for (const d of [-1, 1]) {
    for (let k = 0; k < 3; k++) inkStroke(c, () => { c.beginPath(); c.moveTo(d * 18, 6 + k * 4); c.lineTo(d * (32 + k * 3), 16 + k * 4 + Math.sin(t * 8 + k) * 2); }, 3, color);
    c.save(); c.translate(d * 22, -12); c.rotate(d * (0.3 + w));
    inkStroke(c, () => { c.beginPath(); c.moveTo(0, 10); c.lineTo(d * 6, -6); }, 4, color);
    c.beginPath(); c.arc(d * 8, -12, 9, 0, TAU); fillInk(c, color, 3.5);
    c.beginPath(); c.moveTo(d * 8, -12); c.lineTo(d * 16, -16); c.lineWidth = 3; c.stroke();
    c.restore();
  }
  c.beginPath(); c.ellipse(0, 4, 26, 16, 0, 0, TAU); fillInk(c, color, 4);
  for (const d of [-1, 1]) {
    inkStroke(c, () => { c.beginPath(); c.moveTo(d * 8, -8); c.lineTo(d * 9, -20); }, 3, color);
    c.beginPath(); c.arc(d * 9, -22, 5, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 2.5; c.stroke();
    c.beginPath(); c.arc(d * 9.5, -22, 2.4, 0, TAU); c.fillStyle = INK; c.fill();
  }
  c.beginPath(); c.moveTo(-6, 8); c.quadraticCurveTo(0, 13, 6, 8); c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke();
  c.restore();
}

export function octopus(c: C, x: number, y: number, s: number, t: number, color = PAL.purple) {
  c.save(); c.translate(x, y); c.scale(s / 80, s / 80);
  for (let i = 0; i < 6; i++) {
    const bx = -25 + i * 10;
    inkStroke(c, () => {
      c.beginPath(); c.moveTo(bx, 10);
      for (let k = 1; k <= 5; k++) c.lineTo(bx + (i - 2.5) * k * 2.6 + Math.sin(t * 3 + i + k * 0.8) * 4, 10 + k * 9);
    }, 7, color);
  }
  c.beginPath(); c.ellipse(0, -12, 30, 32, 0, 0, TAU); fillInk(c, color, 4.5);
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-10, -28, 9, 5, -0.5, 0, TAU); c.fill();
  for (const d of [-1, 1]) {
    c.beginPath(); c.arc(d * 11, -10, 7.5, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
    c.beginPath(); c.arc(d * 11 + 1, -9, 3.6, 0, TAU); c.fillStyle = INK; c.fill();
  }
  c.beginPath(); c.moveTo(-7, 4); c.quadraticCurveTo(0, 10, 7, 4); c.lineWidth = 3; c.stroke();
  c.fillStyle = PAL.cheek; c.beginPath(); c.ellipse(-20, 2, 5, 3, 0, 0, TAU); c.ellipse(20, 2, 5, 3, 0, 0, TAU); c.fill();
  c.restore();
}

export function starfish(c: C, x: number, y: number, r: number, t: number, color = PAL.orange) {
  c.save(); c.translate(x, y); c.rotate(Math.sin(t) * 0.08);
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
    c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  c.closePath(); fillInk(c, color, 3.5);
  c.fillStyle = INK;
  c.beginPath(); c.arc(-r * 0.15, -r * 0.08, r * 0.08, 0, TAU); c.arc(r * 0.15, -r * 0.08, r * 0.08, 0, TAU); c.fill();
  c.beginPath(); c.arc(0, r * 0.08, r * 0.12, 0, Math.PI); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
  c.restore();
}

export function seahorse(c: C, x: number, y: number, s: number, t: number, color = '#ffb13b') {
  c.save(); c.translate(x, y + Math.sin(t * 2) * 4); c.scale(s / 70, s / 70);
  inkStroke(c, () => {
    c.beginPath(); c.moveTo(0, -18); c.bezierCurveTo(14, -6, 10, 14, 0, 20); c.bezierCurveTo(-8, 26, -6, 36, 4, 34);
  }, 12, color);
  c.beginPath(); c.ellipse(0, -24, 12, 9, -0.3, 0, TAU); fillInk(c, color, 3.5);
  inkStroke(c, () => { c.beginPath(); c.moveTo(-8, -22); c.lineTo(-22, -20); }, 6, color);
  c.beginPath(); c.arc(2, -26, 3.5, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
  c.beginPath(); c.arc(1.5, -26, 1.8, 0, TAU); c.fillStyle = INK; c.fill();
  c.restore();
}

export function turtle(c: C, x: number, y: number, s: number, face: number, t: number) {
  c.save(); c.translate(x, y); c.scale((face >= 0 ? 1 : -1) * s / 100, s / 100);
  const f = Math.sin(t * 3) * 0.35;
  for (const [fx, fy, d] of [[20, 18, 1], [-22, 18, -1], [22, -14, 1], [-20, -14, -1]] as const) {
    c.save(); c.translate(fx, fy); c.rotate(f * d);
    c.beginPath(); c.ellipse(d * 8, 0, 14, 7, 0.4 * d, 0, TAU); fillInk(c, '#7ccf6a', 3.5); c.restore();
  }
  c.beginPath(); c.ellipse(46, 0, 16, 13, 0, 0, TAU); fillInk(c, '#7ccf6a', 4);
  c.beginPath(); c.arc(52, -4, 4, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke();
  c.beginPath(); c.arc(53, -4, 2, 0, TAU); c.fillStyle = INK; c.fill();
  c.beginPath(); c.moveTo(54, 5); c.quadraticCurveTo(58, 8, 61, 4); c.lineWidth = 2.5; c.stroke();
  c.beginPath(); c.ellipse(0, 0, 38, 26, 0, 0, TAU); fillInk(c, '#3f9b5a', 5);
  c.strokeStyle = INK; c.lineWidth = 3;
  c.beginPath(); c.moveTo(-14, -24); c.lineTo(-10, 0); c.lineTo(-16, 22); c.moveTo(12, -24); c.lineTo(10, 0); c.lineTo(14, 22);
  c.moveTo(-36, 0); c.lineTo(36, 0); c.stroke();
  c.restore();
}

export function shell(c: C, x: number, y: number, t: number, color = '#ffb49a', glow = true) {
  c.save(); c.translate(x, y + Math.sin(t * 2 + x) * 3);
  if (glow) {
    c.fillStyle = 'rgba(255,240,160,.35)';
    c.beginPath(); c.arc(0, 2, 30 + Math.sin(t * 4 + x) * 3, 0, TAU); c.fill();
  }
  c.beginPath(); c.moveTo(0, 12); c.arc(0, 12, 22, Math.PI * 1.08, Math.PI * 1.92); c.closePath();
  fillInk(c, color, 3.5);
  c.lineWidth = 2;
  for (let i = 1; i < 5; i++) {
    const a = Math.PI * (1.08 + (0.84 * i) / 5);
    c.beginPath(); c.moveTo(0, 12); c.lineTo(Math.cos(a) * 20, 12 + Math.sin(a) * 20); c.stroke();
  }
  c.beginPath(); c.ellipse(0, 13, 6, 3.5, 0, 0, TAU); fillInk(c, '#ff8f73', 2);
  c.restore();
}

export function pearl(c: C, x: number, y: number, r: number, t: number) {
  c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.arc(x, y, r * 1.8 + Math.sin(t * 4 + x) * 2, 0, TAU); c.fill();
  c.beginPath(); c.arc(x, y, r, 0, TAU); fillInk(c, '#fff7fb', 3);
  c.fillStyle = '#ffd6ec'; c.beginPath(); c.arc(x + r * 0.25, y + r * 0.25, r * 0.5, 0, TAU); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, TAU); c.fill();
}

export function bubble(c: C, x: number, y: number, r: number) {
  c.beginPath(); c.arc(x, y, r, 0, TAU);
  c.fillStyle = 'rgba(215,247,255,.38)'; c.fill();
  c.lineWidth = 4; c.strokeStyle = '#ffffff'; c.stroke();
  c.beginPath(); c.arc(x - r * 0.36, y - r * 0.36, r * 0.22, 0, TAU); c.fillStyle = '#fff'; c.fill();
}

/** A little green dot of sea food (plankton). */
export function plankton(c: C, x: number, y: number, r: number, t: number) {
  c.save(); c.translate(x, y); c.rotate(t + x);
  c.beginPath();
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  c.closePath(); fillInk(c, '#9be46b', 2.5);
  c.fillStyle = '#e8ffd0'; c.beginPath(); c.arc(-r * 0.2, -r * 0.2, r * 0.3, 0, TAU); c.fill();
  c.restore();
}

export function star(c: C, x: number, y: number, r: number, color: string) {
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2, rr = i % 2 ? r * 0.4 : r;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath(); c.fillStyle = color; c.fill();
  c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
}

export function sparkle(c: C, x: number, y: number, t: number, size = 1) {
  const p = 1 + Math.sin(t * 5) * 0.18;
  c.fillStyle = 'rgba(255,236,140,.4)';
  c.beginPath(); c.arc(x, y, 30 * p * size, 0, TAU); c.fill();
  star(c, x, y, 18 * p * size, '#ffe066');
  star(c, x + 16 * size, y - 16 * size, 6 * (2 - p) * size, '#fff4b8');
}

/** Big friendly arrow pointing along dir (radians). */
export function arrow(c: C, x: number, y: number, angle: number, t: number, size = 1) {
  c.save(); c.translate(x, y); c.rotate(angle); c.translate(Math.sin(t * 6) * 8, 0); c.scale(size, size);
  c.beginPath();
  c.moveTo(32, 0); c.lineTo(2, -28); c.lineTo(2, -12); c.lineTo(-34, -12);
  c.lineTo(-34, 12); c.lineTo(2, 12); c.lineTo(2, 28); c.closePath();
  fillInk(c, PAL.sun, 4);
  c.restore();
}

/** Glowing ring the child swims through. */
export function hoop(c: C, x: number, y: number, r: number, t: number, lit = false) {
  c.save(); c.translate(x, y);
  c.fillStyle = lit ? 'rgba(255,236,140,.45)' : 'rgba(255,255,255,.18)';
  c.beginPath(); c.ellipse(0, 0, r * 0.55, r, 0, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(0, 0, r * 0.55, r, 0, 0, TAU);
  c.lineWidth = 12; c.strokeStyle = INK; c.stroke();
  c.lineWidth = 6; c.strokeStyle = lit ? PAL.sun : `hsl(${(t * 60) % 360},90%,70%)`; c.stroke();
  c.restore();
}

export function heart(c: C, x: number, y: number, s: number, color = PAL.pink) {
  c.save(); c.translate(x, y); c.scale(s / 14, s / 14);
  c.beginPath(); c.moveTo(0, 6); c.bezierCurveTo(-12, -2, -6, -12, 0, -5); c.bezierCurveTo(6, -12, 12, -2, 0, 6);
  fillInk(c, color, 2.2); c.restore();
}

/** Soft circle of light, e.g. what the child is searching with in the dark. */
export function glow(c: C, x: number, y: number, r: number, color = 'rgba(255,240,170,0.35)') {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(255,240,170,0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
}
