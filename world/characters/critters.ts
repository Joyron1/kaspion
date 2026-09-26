// The other sea friends from the story: crab, octopus, seahorse, turtle, starfish, jellyfish.
// Front-facing critters (crab, octopus, starfish, jelly) look toward +z;
// profile critters (seahorse, turtle) face +x like the fish.

import * as THREE from 'three';
import { clay, flat } from '../core/shade';
import { mesh, slab, sweep, V } from '../core/geo';
import { blush, eye, lifecycle, smile, type Creature, type Eye } from './parts';

export interface CritterOpts { baby?: boolean; paint?: boolean; color?: THREE.ColorRepresentation }

const PAPER = '#f4f1ea';

function painter(o: CritterOpts) {
  const parts: Creature['parts'] = {};
  const mat = (name: string, color: THREE.ColorRepresentation, extra: Parameters<typeof clay>[1] = {}) => {
    const m = clay(o.paint ? PAPER : color, extra);
    (parts[name] ??= []).push(m);
    return m;
  };
  return { parts, mat };
}

function face(b: THREE.Object3D, at: THREE.Vector3, eyeR: number, gap: number, iris = '#2c3e75', mouth = 0.22): Eye[] {
  const eyes = [-1, 1].map(side => {
    const e = eye(eyeR, iris);
    e.group.position.set(at.x + side * gap, at.y, at.z);
    e.group.rotation.y = side * 0.18;
    b.add(e.group);
    return e;
  });
  const m = smile(mouth, 0.025);
  m.position.set(at.x, at.y - eyeR * 1.35, at.z + eyeR * 0.3);
  b.add(m);
  for (const side of [-1, 1]) {
    const bl = blush(eyeR * 0.45);
    bl.position.set(at.x + side * (gap + eyeR * 0.7), at.y - eyeR * 1.05, at.z - eyeR * 0.1);
    b.add(bl);
  }
  return eyes;
}

// ---------------------------------------------------------------- crab
export function makeCrab(o: CritterOpts = {}): Creature {
  const { parts, mat } = painter(o);
  const root = new THREE.Group(), b = new THREE.Group();
  root.add(b);
  const shell = mat('body', o.color ?? '#ff5a3c', { rough: 0.4 });
  const claw = mat('claws', o.color ?? '#ff6f4f', { rough: 0.4 });
  const leg = mat('legs', '#ff8a5c');
  const body = mesh(new THREE.SphereGeometry(0.62, 32, 20), shell);
  body.scale.set(1.15, 0.62, 0.85);
  body.position.y = 0.42;
  b.add(body);
  // eye stalks
  const eyes: Eye[] = [];
  for (const side of [-1, 1]) {
    const stalk = mesh(new THREE.CapsuleGeometry(0.05, 0.28, 4, 8), leg);
    stalk.position.set(side * 0.2, 0.86, 0.25);
    b.add(stalk);
    const e = eye(o.baby ? 0.2 : 0.16);
    e.group.position.set(side * 0.21, 1.08, 0.3);
    b.add(e.group);
    eyes.push(e);
  }
  const m = smile(0.3, 0.028);
  m.position.set(0, 0.52, 0.52);
  b.add(m);
  // claws on arms
  const arms: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.62, 0.45, 0.28);
    const up = mesh(new THREE.CapsuleGeometry(0.07, 0.3, 4, 8), claw);
    up.rotation.z = side * -0.9;
    up.position.set(side * 0.16, 0.08, 0);
    arm.add(up);
    const pincer = new THREE.Group();
    pincer.position.set(side * 0.38, 0.3, 0.06);
    const top = mesh(new THREE.SphereGeometry(0.2, 18, 12), claw);
    top.scale.set(1, 0.62, 0.7);
    top.position.y = 0.07;
    const bot = mesh(new THREE.SphereGeometry(0.15, 16, 10), claw);
    bot.scale.set(1, 0.55, 0.65);
    bot.position.set(side * 0.03, -0.1, 0);
    pincer.add(top, bot);
    pincer.userData.bot = bot;
    arm.add(pincer);
    b.add(arm);
    arms.push(arm);
  }
  const legs: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const l = mesh(new THREE.CapsuleGeometry(0.045, 0.34, 4, 6), leg);
      l.position.set(side * (0.52 + i * 0.02), 0.18, 0.12 - i * 0.2);
      l.rotation.z = side * 0.9;
      b.add(l);
      legs.push(l);
    }
  }
  if (o.baby) b.scale.setScalar(0.9);
  return lifecycle({ kind: 'crab', root, body: b, parts, size: 1.5 }, eyes, (dt, t, self) => {
    for (const [i, a] of arms.entries()) {
      a.rotation.z = Math.sin(t * 2 + i * 1.3) * 0.15;
      const bot = (a.children[1] as THREE.Group).userData.bot as THREE.Mesh;
      bot.rotation.z = (Math.sin(t * 5 + i) > 0.6 ? 0.35 : 0) * (i ? 1 : -1);
    }
    for (const [i, l] of legs.entries()) l.rotation.x = Math.sin(t * (4 + self.swim * 10) + i * 1.7) * 0.25;
  }, 0.03);
}

// ---------------------------------------------------------------- octopus
export function makeOctopus(o: CritterOpts = {}): Creature {
  const { parts, mat } = painter(o);
  const root = new THREE.Group(), b = new THREE.Group();
  root.add(b);
  const skin = mat('head', o.color ?? '#b06cf0', { rough: 0.45 });
  const arm = mat('arms', o.color ?? '#c283ff', { rough: 0.45 });
  const spot = mat('spots', '#e3b9ff');
  const head = mesh(new THREE.SphereGeometry(0.7, 32, 24), skin);
  head.scale.set(1, 1.08, 0.95);
  head.position.y = 1.0;
  b.add(head);
  for (const [x, y, z, r] of [[0.3, 1.5, 0.45, 0.1], [-0.35, 1.35, 0.5, 0.08], [0.05, 1.62, 0.32, 0.07], [0.5, 1.15, 0.35, 0.07]]) {
    const s = mesh(new THREE.SphereGeometry(r, 12, 8), spot, false);
    s.scale.z = 0.4;
    s.position.set(x, y, z);
    s.lookAt(0, 1.0, 0);
    s.rotateY(Math.PI);
    b.add(s);
  }
  const eyes = face(b, V(0, 1.02, 0.6), o.baby ? 0.22 : 0.18, 0.22, '#3b2a70', 0.24);
  // tentacles curling outward
  const arms: THREE.Group[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const g = new THREE.Group();
    g.position.set(Math.cos(a) * 0.38, 0.55, Math.sin(a) * 0.38);
    g.rotation.y = -a;
    const pts = [V(0, 0, 0), V(0.25, -0.28, 0), V(0.55, -0.42, 0), V(0.8, -0.3, 0), V(0.85, -0.1, 0), V(0.72, -0.02, 0)];
    g.add(mesh(sweep(pts, u => 0.14 * (1 - u * 0.8), 36, 10), arm));
    b.add(g);
    arms.push(g);
  }
  if (o.baby) b.scale.setScalar(0.9);
  return lifecycle({ kind: 'octopus', root, body: b, parts, size: 1.9 }, eyes, (dt, t, self) => {
    for (const [i, g] of arms.entries()) g.rotation.z = Math.sin(t * (2 + self.swim * 3) + i * 0.8) * 0.22 - 0.05;
    head.scale.y = 1.08 + Math.sin(t * 2) * 0.03;
  }, 0.07);
}

// ---------------------------------------------------------------- seahorse
export function makeSeahorse(o: CritterOpts = {}): Creature {
  const { parts, mat } = painter(o);
  const root = new THREE.Group(), b = new THREE.Group();
  root.add(b);
  const skin = mat('body', o.color ?? '#ffc233', { rough: 0.42 });
  const finM = mat('fin', '#ff9f43');
  const pts = [V(0.02, 0.85, 0), V(0.12, 0.5, 0), V(0.05, 0.1, 0), V(-0.12, -0.25, 0), V(-0.05, -0.62, 0), V(0.18, -0.78, 0), V(0.3, -0.62, 0), V(0.2, -0.5, 0)];
  const radius = (u: number) => u < 0.1 ? 0.14 + u * 1.2 : 0.26 * Math.pow(1 - (u - 0.1) / 0.9, 0.9) + 0.03;
  b.add(mesh(sweep(pts, radius, 64, 16), skin));
  // belly ridges
  for (let i = 0; i < 5; i++) {
    const r = mesh(new THREE.TorusGeometry(0.2 - i * 0.02, 0.018, 6, 20, Math.PI), skin, false);
    r.position.set(0.1 - i * 0.03, 0.42 - i * 0.14, 0);
    r.rotation.set(Math.PI / 2, 0, -0.3 - i * 0.1);
    b.add(r);
  }
  const head = mesh(new THREE.SphereGeometry(0.27, 24, 18), skin);
  head.position.set(0.05, 0.95, 0);
  head.scale.set(1.1, 0.95, 0.85);
  b.add(head);
  const snout = mesh(new THREE.CapsuleGeometry(0.07, 0.3, 6, 10), skin);
  snout.rotation.z = -Math.PI / 2 + 0.25;
  snout.position.set(0.36, 0.88, 0);
  b.add(snout);
  const crest = mesh(new THREE.ConeGeometry(0.08, 0.2, 10), finM);
  crest.position.set(-0.02, 1.2, 0);
  crest.rotation.z = 0.3;
  b.add(crest);
  const dShape = new THREE.Shape();
  dShape.moveTo(0, 0.18); dShape.quadraticCurveTo(-0.3, 0.1, -0.24, -0.18); dShape.lineTo(0, -0.12); dShape.lineTo(0, 0.18);
  const dorsal = mesh(slab(dShape, 0.015, 0.02), finM);
  dorsal.position.set(-0.13, 0.2, 0);
  b.add(dorsal);
  const eyes = [1, -1].map(side => {
    const e = eye(o.baby ? 0.14 : 0.12);
    e.group.position.set(0.12, 1.0, side * 0.18);
    e.group.rotation.y = side > 0 ? 0.4 : Math.PI - 0.4;
    b.add(e.group);
    return e;
  });
  for (const side of [1, -1]) {
    const bl = blush(0.06);
    bl.position.set(0.2, 0.87, side * 0.2);
    bl.rotation.y = side > 0 ? 0.6 : Math.PI - 0.6;
    b.add(bl);
  }
  if (o.baby) b.scale.setScalar(0.9);
  return lifecycle({ kind: 'seahorse', root, body: b, parts, size: 2 }, eyes, (dt, t) => {
    dorsal.scale.x = 1 + Math.sin(t * 16) * 0.25;
    b.rotation.z = Math.sin(t * 1.3) * 0.06;
  }, 0.06);
}

// ---------------------------------------------------------------- turtle
export function makeTurtle(o: CritterOpts = {}): Creature {
  const { parts, mat } = painter(o);
  const root = new THREE.Group(), b = new THREE.Group();
  root.add(b);
  const shellM = mat('shell', o.color ?? '#3aa36a', { rough: 0.38 });
  const patchM = mat('patches', '#8ed16f');
  const skinM = mat('skin', '#9bd88a');
  const shell = mesh(new THREE.SphereGeometry(0.8, 36, 20, 0, Math.PI * 2, 0, Math.PI / 2), shellM);
  shell.scale.set(1.25, 0.72, 1.05);
  b.add(shell);
  const under = mesh(new THREE.CylinderGeometry(0.98, 0.9, 0.12, 36), mat('belly', '#f2e3a6'));
  under.scale.set(1.02, 1, 0.86);
  b.add(under);
  const patchPos: [number, number][] = [[0, 0], [0.45, 0.25], [-0.45, 0.25], [0.45, -0.25], [-0.45, -0.25], [0.02, 0.5], [0.02, -0.5]];
  for (const [x, z] of patchPos) {
    const p = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 6), patchM, false);
    const y = Math.sqrt(Math.max(0, 1 - (x / 1.0) ** 2 - (z / 0.84) ** 2)) * 0.8 * 0.72;
    p.position.set(x, y + 0.01, z);
    p.lookAt(x * 1.4, y + 1, z * 1.4);
    p.rotateX(Math.PI / 2);
    b.add(p);
  }
  const head = new THREE.Group();
  head.position.set(1.12, 0.12, 0);
  const hm = mesh(new THREE.SphereGeometry(0.32, 24, 18), skinM);
  hm.scale.set(1.15, 0.95, 0.95);
  head.add(hm);
  const neck = mesh(new THREE.CapsuleGeometry(0.15, 0.3, 6, 10), skinM);
  neck.rotation.z = Math.PI / 2;
  neck.position.x = -0.3;
  head.add(neck);
  const eyes = [1, -1].map(side => {
    const e = eye(o.baby ? 0.15 : 0.12);
    e.group.position.set(0.14, 0.1, side * 0.22);
    e.group.rotation.y = side > 0 ? 0.5 : Math.PI - 0.5;
    head.add(e.group);
    return e;
  });
  for (const side of [1, -1]) {
    const m = smile(0.18, 0.02);
    m.position.set(0.3, -0.08, side * 0.13);
    m.rotation.y = side > 0 ? 1.1 : Math.PI - 1.1;
    head.add(m);
  }
  b.add(head);
  const flips: THREE.Group[] = [];
  for (const [x, side, big] of [[0.55, 1, 1], [0.55, -1, 1], [-0.6, 1, 0.6], [-0.6, -1, 0.6]]) {
    const piv = new THREE.Group();
    piv.position.set(x, 0, side * 0.7);
    const f = mesh(new THREE.SphereGeometry(0.4 * big, 18, 10), skinM);
    f.scale.set(1.2, 0.18, 0.55);
    f.position.set(-0.1, 0, side * 0.3 * big);
    f.rotation.y = side * 0.5;
    piv.add(f);
    b.add(piv);
    flips.push(piv);
  }
  if (o.baby) b.scale.setScalar(0.85);
  return lifecycle({ kind: 'turtle', root, body: b, parts, size: 2.4 }, eyes, (dt, t, self) => {
    const sp = 2 + self.swim * 3;
    for (const [i, f] of flips.entries()) f.rotation.x = Math.sin(t * sp + (i < 2 ? 0 : 1.5)) * 0.4 * (i % 2 ? -1 : 1);
    head.rotation.z = Math.sin(t * 0.9) * 0.08;
  }, 0.05);
}

// ---------------------------------------------------------------- starfish
export function makeStarfish(o: CritterOpts = {}): Creature {
  const { parts, mat } = painter(o);
  const root = new THREE.Group(), b = new THREE.Group();
  root.add(b);
  const m = mat('body', o.color ?? '#ff8c42', { rough: 0.55 });
  const dots = mat('dots', '#ffd2a1');
  const s = new THREE.Shape();
  const N = 5;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2 + Math.PI / 2;
    const tip = V(Math.cos(a) * 0.9, Math.sin(a) * 0.9);
    const a2 = a + Math.PI / N;
    const valley = V(Math.cos(a2) * 0.36, Math.sin(a2) * 0.36);
    if (i === 0) s.moveTo(tip.x, tip.y);
    else s.quadraticCurveTo(Math.cos(a - Math.PI / N) * 0.62, Math.sin(a - Math.PI / N) * 0.62, tip.x, tip.y);
    if (i < N) s.quadraticCurveTo(Math.cos(a + 0.18) * 0.6, Math.sin(a + 0.18) * 0.6, valley.x, valley.y);
  }
  const star = mesh(slab(s, 0.18, 0.12, 12), m);
  star.position.y = 0.95;
  b.add(star);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + Math.PI / 2;
    for (const r of [0.55, 0.72]) {
      const d = mesh(new THREE.SphereGeometry(0.045, 8, 6), dots, false);
      d.position.set(Math.cos(a) * r, 0.95 + Math.sin(a) * r, 0.2);
      b.add(d);
    }
  }
  const eyes = face(b, V(0, 1.02, 0.2), o.baby ? 0.13 : 0.11, 0.13, '#3b2a70', 0.16);
  if (o.baby) b.scale.setScalar(0.85);
  return lifecycle({ kind: 'starfish', root, body: b, parts, size: 1.8 }, eyes, (dt, t) => {
    star.rotation.z = Math.sin(t * 1.2) * 0.08;
  }, 0.05);
}

// ---------------------------------------------------------------- jellyfish
export function makeJelly(o: CritterOpts = {}): Creature {
  const { parts, mat } = painter(o);
  const root = new THREE.Group(), b = new THREE.Group();
  root.add(b);
  const bellM = mat('bell', o.color ?? '#ff8fd0', { rough: 0.3, emissive: o.paint ? '#000' : '#5a1848' });
  if (!o.paint) { bellM.transparent = true; bellM.opacity = 0.9; }
  const bell = mesh(new THREE.SphereGeometry(0.7, 36, 20, 0, Math.PI * 2, 0, Math.PI * 0.55), bellM);
  bell.position.y = 1.2;
  bell.scale.set(1, 0.95, 1);
  b.add(bell);
  const rim = mesh(new THREE.TorusGeometry(0.62, 0.07, 10, 36), mat('frill', '#ffc1e6'));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.12;
  b.add(rim);
  const tent = mat('tentacles', '#ffb3de');
  const strands: THREE.Mesh[] = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const x = Math.cos(a) * 0.4, z = Math.sin(a) * 0.4;
    const pts = [V(x, 1.1, z), V(x * 1.1 + 0.05, 0.7, z), V(x * 0.9 - 0.05, 0.3, z), V(x * 1.05, -0.1, z)];
    const s = mesh(sweep(pts, u => 0.05 * (1 - u * 0.7), 20, 6), tent, false);
    b.add(s);
    strands.push(s);
  }
  const eyes = face(b, V(0, 1.4, 0.56), o.baby ? 0.15 : 0.13, 0.17, '#5a2a70', 0.2);
  if (o.baby) b.scale.setScalar(0.85);
  return lifecycle({ kind: 'jelly', root, body: b, parts, size: 1.6 }, eyes, (dt, t) => {
    const p = Math.sin(t * 2.4);
    bell.scale.set(1 + p * 0.06, 0.95 - p * 0.06, 1 + p * 0.06);
    for (const [i, s] of strands.entries()) s.rotation.z = Math.sin(t * 2 + i) * 0.08;
  }, 0.1);
}

export const shadowMat = flat('#0f1d3a');
