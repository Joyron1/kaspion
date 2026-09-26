// Small textures drawn once on a canvas: sparkles, hearts, soft dots, light shafts.

import * as THREE from 'three';

const cache = new Map<string, THREE.Texture>();

function make(key: string, size: number, draw: (c: CanvasRenderingContext2D, s: number) => void): THREE.Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const c = cv.getContext('2d')!;
  draw(c, size);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, t);
  return t;
}

export const softDot = () => make('dot', 64, (c, s) => {
  const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, s, s);
});

export const sparkle = () => make('sparkle', 128, (c, s) => {
  const m = s / 2;
  const g = c.createRadialGradient(m, m, 0, m, m, m * 0.5);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, s, s);
  c.fillStyle = '#fff';
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? m * 0.95 : m * 0.12;
    c.lineTo(m + Math.cos(a) * r, m + Math.sin(a) * r);
  }
  c.fill();
});

export const star = () => make('star', 128, (c, s) => {
  const m = s / 2;
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? m * 0.9 : m * 0.42;
    c.lineTo(m + Math.cos(a) * r, m + Math.sin(a) * r);
  }
  c.closePath();
  c.fillStyle = '#ffd84a'; c.fill();
  c.lineJoin = 'round'; c.lineWidth = 7; c.strokeStyle = '#ffffff'; c.stroke();
});

export const heart = () => make('heart', 128, (c, s) => {
  c.translate(s / 2, s / 2 + 6);
  c.beginPath();
  c.moveTo(0, 36);
  c.bezierCurveTo(-58, -2, -40, -52, 0, -22);
  c.bezierCurveTo(40, -52, 58, -2, 0, 36);
  c.fillStyle = '#ff5e8a'; c.fill();
  c.lineWidth = 6; c.strokeStyle = '#fff'; c.stroke();
});

export const bubble = () => make('bubble', 128, (c, s) => {
  const m = s / 2;
  const g = c.createRadialGradient(m * 0.8, m * 0.8, m * 0.1, m, m, m * 0.95);
  g.addColorStop(0, 'rgba(255,255,255,0.05)');
  g.addColorStop(0.75, 'rgba(200,240,255,0.18)');
  g.addColorStop(0.95, 'rgba(255,255,255,0.85)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.beginPath(); c.arc(m, m, m * 0.96, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.95)';
  c.beginPath(); c.ellipse(m * 0.62, m * 0.55, m * 0.16, m * 0.09, -0.7, 0, Math.PI * 2); c.fill();
});

/** vertical light shaft: bright at the top, fading down and at the sides */
export const shaft = () => make('shaft', 128, (c, s) => {
  const img = c.createImageData(s, s);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const u = x / (s - 1), v = y / (s - 1);
      const side = Math.pow(Math.sin(u * Math.PI), 2.2);
      const fall = Math.pow(1 - v, 1.6);
      const a = side * fall;
      const i = (y * s + x) * 4;
      img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255; img.data[i + 3] = Math.round(a * 255);
    }
  }
  c.putImageData(img, 0, 0);
});

/** a soft round shadow blob */
export const blob = () => make('blob', 64, (c, s) => {
  const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(0,20,50,0.55)'); g.addColorStop(1, 'rgba(0,20,50,0)');
  c.fillStyle = g; c.fillRect(0, 0, s, s);
});
