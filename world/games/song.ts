// Shell song: four singing shells on the sand. They sing a little tune (each shell opens,
// glows and sings its note); then the child sings it back by touching the shells in order.
// The tunes grow a note longer as the game goes on.

import * as THREE from 'three';
import { clay } from '../core/shade';
import { softDot } from '../core/tex';
import { pick, type Ctx, type Game } from './kit';

const COLORS = ['#ff5e7e', '#ffc93c', '#4cd97b', '#3fa9f5'];
const NOTES = [523.25, 659.25, 783.99, 1046.5]; // C E G C

interface Shell { root: THREE.Group; lid: THREE.Group; mat: THREE.MeshStandardMaterial; halo: THREE.Sprite; open: number; lit: number }

function shellGeo(): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, 36, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const p = g.getAttribute('position');
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const rib = 1 + Math.cos(Math.atan2(v.z, v.x) * 9) * 0.05 * Math.min(1, Math.hypot(v.x, v.z) * 1.5);
    p.setXYZ(i, v.x * rib, v.y * 0.42 * rib, v.z * rib);
  }
  g.translate(0, 0, 1);
  g.computeVertexNormals();
  return g;
}

export function songGame(ctx: Ctx): Game {
  const hw = Math.min(7, ctx.halfWidth(0) * 0.9);
  const geo = shellGeo();
  const shells: Shell[] = COLORS.map((color, i) => {
    const root = new THREE.Group();
    const mat = clay(color, { rough: 0.35, rim: 0.5, emissive: '#000000' });
    mat.side = THREE.DoubleSide;
    const bottom = new THREE.Mesh(geo, mat);
    bottom.scale.set(0.9, -0.8, 0.8);
    bottom.position.z = -0.8;
    const lid = new THREE.Group();
    lid.position.set(0, 0.02, -0.8);
    const top = new THREE.Mesh(geo, mat);
    top.scale.set(0.9, 0.9, 0.8);
    lid.add(top);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(3.2);
    halo.position.y = 0.6;
    root.add(bottom, lid, halo);
    root.scale.setScalar(1.35);
    bottom.castShadow = top.castShadow = true;
    const x = (i - 1.5) * Math.min(2.9, hw * 0.42);
    root.position.set(x, 0.4, 0.6 - Math.abs(i - 1.5) * 0.6);
    root.rotation.y = -x * 0.05;
    ctx.group.add(root);
    return { root, lid, mat, halo, open: 0, lit: 0 };
  });

  // tune lengths grow slowly: 1, 2, 2, 3, 3 (never more than 3 notes)
  const lengths = Array.from({ length: ctx.count }, (_, i) => Math.min(3, 1 + Math.floor((i * 3) / Math.max(1, ctx.count - 1) + 0.34)));
  let round = 0, tune: number[] = [], step = 0, phase: 'intro' | 'sing' | 'listen' | 'happy' | 'done' = 'intro';
  let t0 = 0, clock = 0, wait = 0;

  const newTune = () => {
    tune = [];
    for (let i = 0; i < lengths[round]; i++) {
      let n = Math.floor(Math.random() * 4);
      if (i > 0 && n === tune[i - 1]) n = (n + 1 + Math.floor(Math.random() * 3)) % 4;
      tune.push(n);
    }
  };
  const sound = (i: number) => {
    const s = shells[i];
    s.lit = 1;
    ctx.note(NOTES[i]);
    ctx.fx.burst(s.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.8, 0)), 'sparkle', 5, 1.5, 0.3);
  };
  const sing = async (first: boolean) => {
    phase = 'sing';
    step = 0;
    await ctx.say(first ? 'world.song.intro' : 'world.song.listen');
    t0 = clock + 0.4;
  };

  const game: Game = {
    camera: { pos: new THREE.Vector3(0, 3.9, 8.6), look: new THREE.Vector3(0, 1.1, 0) },
    kaspionSpot: new THREE.Vector3(-hw + 0.4, 4.8, -2),
    update(dt, t) {
      clock += dt;
      if (phase === 'intro') { phase = 'sing'; newTune(); t0 = Infinity; void sing(true); }
      // the shells play the tune, one note every 0.8 s
      if (phase === 'sing' && clock >= t0) {
        const i = Math.floor((clock - t0) / 0.8);
        if (i < tune.length && i >= step) { sound(tune[i]); step = i + 1; }
        if (i >= tune.length) { phase = 'listen'; step = 0; void ctx.say('world.song.your'); }
      }
      if (phase === 'happy') {
        wait -= dt;
        if (wait <= 0) {
          round++;
          if (round >= ctx.count) phase = 'done';
          else { newTune(); t0 = Infinity; void sing(false); }
        }
      }
      for (const s of shells) {
        s.lit = Math.max(0, s.lit - dt * 1.6);
        const want = s.lit > 0.05 ? 1 : 0.12;
        s.open += (want - s.open) * Math.min(1, dt * 10);
        s.lid.rotation.x = -s.open * 1.0;
        s.halo.material.opacity = s.lit * 0.9;
        s.mat.emissive.copy(s.mat.color).multiplyScalar(s.lit * 0.5);
        s.root.position.y = 0.4 + s.lit * 0.25 + Math.sin(t * 2 + s.root.position.x) * 0.02;
      }
    },
    tap(e) {
      if (e.kind !== 'down' || phase !== 'listen') return;
      const hit = pick(e.ray, shells);
      if (!hit) return;
      const i = shells.indexOf(hit as Shell);
      sound(i);
      if (i === tune[step]) {
        step++;
        if (step >= tune.length) {
          phase = 'happy';
          wait = 2;
          ctx.kaspion.cheer();
          ctx.fx.celebrate(hit.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.2, 0)), 1);
          ctx.praise();
        }
      } else {
        // a wrong note: listen again, same tune
        ctx.sfx('bonk');
        void ctx.say('world.try').then(() => { if (phase === 'sing' && t0 === Infinity) void sing(false); });
        phase = 'sing';
        t0 = Infinity;
      }
    },
    progress: () => ({ got: round, goal: ctx.count }),
    done: () => phase === 'done',
    hint: () => (phase === 'listen' ? shells[tune[step]].root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.4, 0)) : null),
    auto() {
      if (phase !== 'listen') return;
      const s = shells[tune[step]];
      const cam = ctx.stage.camera;
      const p = s.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.3, 0));
      const ray = new THREE.Raycaster(cam.position.clone(), p.sub(cam.position).normalize());
      ray.camera = cam;
      game.tap({ kind: 'down', ray, ndc: new THREE.Vector2() });
    },
    debug: () => ({ round, phase, tune, step }),
    dispose() { for (const s of shells) ctx.group.remove(s.root); geo.dispose(); },
  };
  return game;
}
