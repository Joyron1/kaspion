// Kaspion and the other little fish. Body along +x (nose), tail at -x.

import * as THREE from 'three';
import { clay, silver, waveOf, type Wave } from '../core/shade';
import { body, fishProfile, mesh, slab, tintByHeight } from '../core/geo';
import { sparkle } from '../core/tex';
import { blush, eye, lifecycle, smile, type Creature } from './parts';

export interface FishOpts {
  /** Kaspion's silver; otherwise a colorful fish */
  silver?: boolean;
  color?: THREE.ColorRepresentation;
  belly?: THREE.ColorRepresentation;
  fin?: THREE.ColorRepresentation;
  baby?: boolean;
  /** plain white parts for the coloring game */
  paint?: boolean;
  /** rounder / longer body */
  chubby?: number;
  /** add a twinkling glint on the back */
  glint?: boolean;
}

const LEN = 1.6;

export function makeFish(o: FishOpts = {}): Creature {
  const root = new THREE.Group();
  const b = new THREE.Group();
  root.add(b);
  const chub = o.chubby ?? 1;
  const maxR = 0.5 * chub * (o.baby ? 1.1 : 1);
  const profile = fishProfile(maxR, 0.6, 0.13, 0.25);

  const wave: Wave = { axis: 'z', amp: 0.04, freq: 3.2, speed: 5, from: -0.25, to: 0.8 };
  const parts: Creature['parts'] = {};
  const paintMat = (name: string, color: THREE.ColorRepresentation, w?: Wave) => {
    const m = clay(color, { wave: w, rim: 0.4 });
    (parts[name] ??= []).push(m);
    return m;
  };

  // body
  const g = body(LEN, profile, { squashZ: 0.62, squashY: 1 });
  let bodyMat: THREE.MeshStandardMaterial;
  if (o.paint) bodyMat = paintMat('body', '#f4f1ea', wave);
  else if (o.silver) {
    tintByHeight(g, '#8fb0dc', '#ffffff', 0.05, 0.3);
    bodyMat = silver({ wave, vertexColors: true });
  } else {
    tintByHeight(g, o.color ?? '#ff8a3d', o.belly ?? '#fff1d6', -0.05, 0.25);
    bodyMat = clay('#ffffff', { wave, vertexColors: true, rim: 0.45 });
  }
  const bodyMesh = mesh(g, bodyMat);
  b.add(bodyMesh);

  const finColor = o.fin ?? (o.silver ? '#b9d4f6' : o.color ?? '#ffb347');
  const finMat = o.paint ? paintMat('fins', '#f4f1ea') : o.silver
    ? (() => { const m = silver(); m.color.set('#cfe2fb'); m.transparent = true; m.opacity = 0.92; return m; })()
    : clay(finColor, { rim: 0.5 });
  const tailMat = o.paint ? paintMat('tail', '#f4f1ea') : finMat;

  // tail fin on a pivot at the tail stalk
  const tailShape = new THREE.Shape();
  tailShape.moveTo(0.06, 0.09);
  tailShape.bezierCurveTo(-0.15, 0.2, -0.36, 0.48, -0.56, 0.5);
  tailShape.quadraticCurveTo(-0.36, 0, -0.56, -0.5);
  tailShape.bezierCurveTo(-0.36, -0.48, -0.15, -0.2, 0.06, -0.09);
  tailShape.lineTo(0.06, 0.09);
  const tailPivot = new THREE.Group();
  tailPivot.position.x = -LEN / 2 + 0.1;
  tailPivot.add(mesh(slab(tailShape, 0.03, 0.035), tailMat));
  b.add(tailPivot);

  // dorsal fin
  const dShape = new THREE.Shape();
  dShape.moveTo(0.28, 0);
  dShape.bezierCurveTo(0.2, 0.2, -0.05, 0.36, -0.3, 0.34);
  dShape.quadraticCurveTo(-0.22, 0.12, -0.36, 0);
  dShape.lineTo(0.28, 0);
  const dorsal = mesh(slab(dShape, 0.02, 0.03), finMat);
  dorsal.position.set(0, maxR * 0.86, 0);
  b.add(dorsal);

  // pectoral fins: little paddles that flap
  const pShape = new THREE.Shape();
  pShape.moveTo(0, 0);
  pShape.bezierCurveTo(-0.1, 0.14, -0.34, 0.12, -0.36, 0);
  pShape.bezierCurveTo(-0.3, -0.1, -0.1, -0.08, 0, 0);
  const pecs: THREE.Group[] = [];
  for (const side of [1, -1]) {
    const piv = new THREE.Group();
    piv.position.set(0.12, -maxR * 0.28, side * maxR * 0.6);
    const f = mesh(slab(pShape, 0.015, 0.02), finMat);
    f.rotation.x = side * 1.2;
    piv.add(f);
    b.add(piv);
    pecs.push(piv);
  }

  // face
  const eyeR = (o.baby ? 0.24 : 0.2) * (o.baby ? 1 : Math.min(1.1, chub));
  const eyes = [1, -1].map(side => {
    const e = eye(eyeR, o.silver ? '#2f6fd6' : '#2c3e75');
    e.group.position.set(LEN * 0.24, maxR * 0.22, side * maxR * 0.5);
    e.group.rotation.y = side > 0 ? 0.55 : Math.PI - 0.55;
    b.add(e.group);
    return e;
  });
  for (const side of [1, -1]) {
    const m = smile(0.2, 0.022, '#1b2440', 0.3);
    m.position.set(LEN * 0.44, -maxR * 0.2, side * maxR * 0.3);
    m.rotation.y = side > 0 ? 0.9 : Math.PI - 0.9;
    b.add(m);
    const bl = blush(0.08);
    bl.position.set(LEN * 0.3, -maxR * 0.12, side * maxR * 0.54);
    bl.rotation.y = side > 0 ? 0.5 : Math.PI - 0.5;
    b.add(bl);
  }

  // the famous silver glint
  let glint: THREE.Sprite | null = null;
  if (o.glint) {
    glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkle(), color: '#ffffff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glint.position.set(0.05, maxR * 0.7, maxR * 0.3);
    b.add(glint);
  }

  const w = waveOf(bodyMat)!;
  const size = LEN * (o.baby ? 0.9 : 1);
  return lifecycle({ kind: o.silver ? 'kaspion' : 'fish', root, body: b, parts, size }, eyes, (dt, t, self) => {
    const s = self.swim;
    w.uWaveAmp.value = 0.035 + s * 0.07;
    w.uWaveSpeed.value = 5 + s * 8;
    const ph = t * w.uWaveSpeed.value - 0.72 * 3.2 - 0.9;
    tailPivot.rotation.y = Math.sin(ph) * (0.25 + s * 0.35);
    for (const [i, p] of pecs.entries()) p.rotation.y = (i ? -1 : 1) * (0.3 + Math.sin(t * (6 + s * 6) + i) * 0.35);
    if (glint) {
      const k = Math.max(0, Math.sin(t * 1.7)) ** 6;
      glint.scale.setScalar(0.1 + k * 0.55);
      glint.material.rotation = t * 0.8;
      glint.material.opacity = 0.3 + k * 0.7;
    }
  }, 0.05);
}

export const makeKaspion = () => makeFish({ silver: true, glint: true });
