// Geometry helpers for building soft, rounded characters out of code.

import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/**
 * A tube along a smooth curve whose thickness changes along the way
 * (tentacles, a seahorse's curled tail, a whale's smile).
 */
export function sweep(points: THREE.Vector3[], radius: (u: number) => number, segs = 48, radial = 14): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const frames = curve.computeFrenetFrames(segs, false);
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const P = new THREE.Vector3(), N = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    curve.getPointAt(u, P);
    const r = Math.max(0.0001, radius(u));
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      N.copy(frames.normals[i]).multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[i], Math.sin(a));
      pos.push(P.x + N.x * r, P.y + N.y * r, P.z + N.z * r);
      uv.push(u, j / radial);
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * A body of revolution along +x (nose at +x, tail at -x). `profile` gives the
 * radius at each point of the length, 0 at the nose and tail.
 */
export function body(len: number, profile: (u: number) => number, opts: { segs?: number; radial?: number; squashZ?: number; squashY?: number } = {}): THREE.BufferGeometry {
  const segs = opts.segs ?? 40;
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs; // 0 = tail, 1 = nose
    pts.push(new THREE.Vector2(Math.max(0.0005, profile(u)), -len / 2 + u * len));
  }
  const g = new THREE.LatheGeometry(pts, opts.radial ?? 32);
  g.rotateZ(-Math.PI / 2); // +y (nose) -> +x
  g.scale(1, opts.squashY ?? 1, opts.squashZ ?? 1);
  g.computeVertexNormals();
  return g;
}

/** A smooth fish-like profile: blunt rounded nose, fat front, thin tail stalk. */
export function fishProfile(maxR: number, peak = 0.62, tail = 0.12, nose = 0.35) {
  return (u: number) => {
    if (u > peak) {
      const k = (u - peak) / (1 - peak);
      return maxR * Math.sqrt(Math.max(0, 1 - Math.pow(k, 2 + nose * 2)));
    }
    const k = u / peak;
    return maxR * (tail + (1 - tail) * Math.sin(k * Math.PI / 2) ** 1.4);
  };
}

/** Color vertices by height: back color on top, belly color below, soft blend. */
export function tintByHeight(g: THREE.BufferGeometry, top: THREE.ColorRepresentation, belly: THREE.ColorRepresentation, split = 0, soft = 0.25) {
  const a = new THREE.Color(top), b = new THREE.Color(belly), c = new THREE.Color();
  const p = g.getAttribute('position');
  const col = new Float32Array(p.count * 3);
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  const h = bb.max.y - bb.min.y || 1;
  for (let i = 0; i < p.count; i++) {
    const y = (p.getY(i) - bb.min.y) / h - 0.5;
    const k = THREE.MathUtils.smoothstep(y, split - soft, split + soft);
    c.copy(b).lerp(a, k);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

/** A soft extruded flat shape (fins, tails, stars). Lies in the x-y plane. */
export function slab(shape: THREE.Shape, depth = 0.04, bevel = 0.03, curveSegs = 18): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: curveSegs,
  });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}

/** Bumpy rounded rock. */
export function rockGeo(seed = 1, detail = 3): THREE.BufferGeometry {
  // merge the icosahedron's corners so the rock shades smooth, not faceted
  const ico = new THREE.IcosahedronGeometry(1, detail);
  ico.deleteAttribute('normal');
  ico.deleteAttribute('uv');
  const g = mergeVertices(ico);
  const p = g.getAttribute('position');
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 2.1 + seed) * Math.cos(v.y * 1.7 + seed * 2) * 0.16 + Math.sin(v.z * 3.3 + seed * 3) * 0.07;
    v.multiplyScalar(1 + n);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Deterministic random numbers, so the world is the same on every visit. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

export function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, shadow = true): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = shadow;
  m.receiveShadow = shadow;
  return m;
}
