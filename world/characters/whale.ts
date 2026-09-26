// The whales: the little lost whale, his mother and his father.
// In the book they are dark; here a deep ink-blue with a pale belly.

import * as THREE from 'three';
import { clay, waveOf, type Wave } from '../core/shade';
import { body, mesh, slab, sweep, tintByHeight, V } from '../core/geo';
import { blush, eye, lifecycle, type Creature } from './parts';

export type WhaleRole = 'baby' | 'mama' | 'papa';

export interface WhaleOpts { role?: WhaleRole; paint?: boolean }

const LEN = 4;

const LOOKS: Record<WhaleRole, { top: string; belly: string; chub: number; eye: number }> = {
  baby: { top: '#2b4488', belly: '#d6e4f5', chub: 1.12, eye: 0.3 },
  mama: { top: '#2e3870', belly: '#efdcef', chub: 1, eye: 0.24 },
  papa: { top: '#1a2344', belly: '#c9d7ea', chub: 1.05, eye: 0.22 },
};

export function makeWhale(o: WhaleOpts = {}): Creature {
  const role = o.role ?? 'baby';
  const look = LOOKS[role];
  const root = new THREE.Group();
  const b = new THREE.Group();
  root.add(b);
  const maxR = 1.0 * look.chub;
  // fat all the way back, a big round head, then a short tail stock
  const prof = (u: number) => {
    if (u > 0.7) { const k = (u - 0.7) / 0.3; return maxR * Math.sqrt(Math.max(0, 1 - Math.pow(k, 2.4))); }
    const k = u / 0.7;
    return maxR * (0.13 + 0.87 * Math.pow(Math.sin(k * Math.PI / 2), 0.7));
  };
  const sqY = 0.92, sqZ = 0.88;
  const parts: Creature['parts'] = {};

  const wave: Wave = { axis: 'y', amp: 0.06, freq: 1.3, speed: 2.2, from: 0.2, to: 2.1 };
  const g = body(LEN, prof, { squashY: sqY, squashZ: sqZ, radial: 40, segs: 48 });
  // the classic cartoon-whale curve: the tail sweeps up
  const lift = (x: number) => (x < -0.3 ? Math.pow((-x - 0.3) / 1.7, 2) * 0.85 : 0);
  {
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + lift(p.getX(i)));
    g.computeVertexNormals();
  }
  let mat: THREE.MeshStandardMaterial;
  if (o.paint) {
    mat = clay('#f4f1ea', { wave, rim: 0.4 });
    parts.body = [mat];
  } else {
    tintByHeight(g, look.top, look.belly, -0.12, 0.12);
    mat = clay('#ffffff', { wave, vertexColors: true, rough: 0.4, rim: 0.4, rimColor: '#9fe6ff' });
  }
  b.add(mesh(g, mat));

  const finMat = o.paint ? clay('#f4f1ea', { rim: 0.4 }) : clay(look.top, { rough: 0.45, rim: 0.4, rimColor: '#9fe6ff' });
  if (o.paint) parts.fins = [finMat];

  // a point on the skin: x along the body, angle around it (0 = side +z, +PI/2 = top)
  const skin = (x: number, ang: number, out = 1) => {
    const u = (x + LEN / 2) / LEN;
    const r = prof(u) * out;
    return V(x, Math.sin(ang) * r * sqY, Math.cos(ang) * r * sqZ);
  };

  // tail flukes
  const fl = new THREE.Shape();
  fl.moveTo(0.1, 0.12);
  fl.bezierCurveTo(-0.3, 0.3, -0.55, 0.9, -0.95, 1.05);
  fl.bezierCurveTo(-0.8, 0.55, -0.72, 0.2, -0.6, 0);
  fl.bezierCurveTo(-0.72, -0.2, -0.8, -0.55, -0.95, -1.05);
  fl.bezierCurveTo(-0.55, -0.9, -0.3, -0.3, 0.1, -0.12);
  fl.lineTo(0.1, 0.12);
  const flukes = new THREE.Group();
  flukes.position.set(-LEN / 2 + 0.25, lift(-LEN / 2 + 0.25), 0);
  flukes.scale.setScalar(1.2);
  const flm = mesh(slab(fl, 0.08, 0.07), finMat);
  flm.rotation.set(0.4, 0, 0.3);
  flukes.add(flm);
  b.add(flukes);

  // flippers
  const flippers: THREE.Group[] = [];
  for (const side of [1, -1]) {
    const piv = new THREE.Group();
    piv.position.copy(skin(0.55, -0.55, 0.92)).setZ(skin(0.55, -0.55, 0.92).z * side);
    const f = mesh(new THREE.SphereGeometry(0.5, 20, 12), finMat);
    f.scale.set(1.1, 0.14, 0.42);
    f.position.set(-0.35, -0.05, side * 0.3);
    f.rotation.y = side * -0.5;
    piv.add(f);
    b.add(piv);
    flippers.push(piv);
  }

  // eyes, low on the big head
  const eyeX = LEN * 0.3;
  const eyes = [1, -1].map(side => {
    const e = eye(look.eye, role === 'papa' ? '#3a5a99' : '#4a88e0');
    const p = skin(eyeX, 0.12, 0.9);
    e.group.position.set(p.x, p.y, p.z * side);
    e.group.rotation.y = side > 0 ? 0.35 : Math.PI - 0.35;
    b.add(e.group);
    return e;
  });

  // a long happy smile along each side of the head
  for (const side of [1, -1]) {
    const pts = [skin(LEN * 0.47, -0.05, 1.01), skin(LEN * 0.42, -0.28, 1.01), skin(LEN * 0.32, -0.4, 1.01), skin(LEN * 0.22, -0.3, 1.01), skin(LEN * 0.18, -0.18, 1.01)];
    for (const p of pts) p.z *= side;
    b.add(mesh(sweep(pts, u => 0.035 * (0.5 + Math.sin(u * Math.PI) * 0.5), 32, 8), clay('#141c33', { rim: 0 }), false));
    const bl = blush(0.16);
    const p = skin(LEN * 0.25, -0.12, 1.0);
    bl.position.set(p.x, p.y, p.z * side);
    bl.rotation.y = side > 0 ? 0.3 : Math.PI - 0.3;
    b.add(bl);
  }

  // mama's eyelashes
  if (role === 'mama') {
    for (const [i, e] of eyes.entries()) {
      for (let k = 0; k < 3; k++) {
        const lash = mesh(new THREE.CapsuleGeometry(0.018, 0.13, 3, 6), clay('#141c33', { rim: 0 }), false);
        const a = 0.9 + k * 0.35;
        lash.position.set(Math.cos(a) * look.eye * 0.95, Math.sin(a) * look.eye * 0.95, look.eye * 0.2);
        lash.rotation.z = a - Math.PI / 2;
        e.group.add(lash);
      }
      void i;
    }
  }

  // blowhole
  const hole = mesh(new THREE.SphereGeometry(0.1, 10, 8), clay('#141c33', { rim: 0 }), false);
  hole.position.copy(skin(LEN * 0.18, Math.PI / 2, 0.99));
  hole.scale.set(1.4, 0.4, 1);
  b.add(hole);

  const w = waveOf(mat)!;
  const size = LEN * (role === 'baby' ? 1 : 1.35);
  const self = lifecycle({ kind: 'whale', root, body: b, parts, size }, eyes, (dt, t, me) => {
    const s = me.swim;
    w.uWaveAmp.value = 0.05 + s * 0.12;
    w.uWaveSpeed.value = 1.8 + s * 2.4;
    flukes.rotation.z = Math.sin(t * w.uWaveSpeed.value - 2.4) * (0.18 + s * 0.3);
    for (const [i, f] of flippers.entries()) f.rotation.x = (i ? -1 : 1) * Math.sin(t * 1.6) * 0.2;
  }, 0.025);
  if (role !== 'baby') root.scale.setScalar(1.35);
  return self;
}

/** where the blowhole is (local), for spout effects */
export const BLOWHOLE = V(LEN * 0.18, 0.95, 0);
