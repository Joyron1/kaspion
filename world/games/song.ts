// Shell song: three big singing shells on the sand. The shells sing a very short tune:
// the singing shell jumps up, opens, glows and sends out music notes. Then it's the
// child's turn to touch the shells in the same order.
// Kept easy for 3-5 year olds: first a single note, then two; a shell that should be
// touched starts glowing after a short wait; a wrong touch never restarts the tune,
// the right shell simply sings again ("this one!").

import * as THREE from 'three';
import { clay } from '../core/shade';
import { softDot } from '../core/tex';
import { pick, rayTo, type Ctx, type Game } from './kit';

const COLORS = ['#ff5e7e', '#ffc93c', '#3fa9f5'];
const NOTES = [523.25, 659.25, 783.99]; // C E G

interface Shell { root: THREE.Group; lid: THREE.Group; mat: THREE.MeshStandardMaterial; halo: THREE.Sprite; pearl: THREE.Mesh; open: number; lit: number; jump: number; color: string }

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
    // a glowing pearl inside: it is what sings
    const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), new THREE.MeshPhysicalMaterial({ color: '#fff6fb', roughness: 0.1, clearcoat: 1, emissive: color, emissiveIntensity: 0 }));
    pearl.position.set(0, 0.15, 0);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(4);
    halo.position.y = 0.7;
    root.add(bottom, lid, pearl, halo);
    bottom.castShadow = top.castShadow = true;
    root.scale.setScalar(1.6);
    const x = (i - 1) * Math.min(4, hw * 0.6);
    root.position.set(x, 0.4, 0.4 - Math.abs(i - 1) * 0.5);
    ctx.group.add(root);
    return { root, lid, mat, halo, pearl, open: 0, lit: 0, jump: 0, color };
  });

  // tune lengths: 1, 1, 2, 2, 2 (a third note only when parents ask for more than 5 rounds)
  const lengths = Array.from({ length: ctx.count }, (_, i) => (i < 2 ? 1 : i < 5 ? 2 : 3));
  let round = 0, tune: number[] = [], step = 0;
  let phase: 'intro' | 'sing' | 'listen' | 'happy' | 'done' = 'intro';
  let t0 = Infinity, clock = 0, wait = 0, idle = 0, glowHint = -1, glowT = 0;
  const NOTE_GAP = 1.1;

  const newTune = () => {
    tune = [];
    for (let i = 0; i < lengths[round]; i++) {
      let n = Math.floor(Math.random() * 3);
      if (i > 0 && n === tune[i - 1]) n = (n + 1 + Math.floor(Math.random() * 2)) % 3;
      tune.push(n);
    }
  };
  const sound = (i: number, big = true) => {
    const s = shells[i];
    s.lit = 1;
    if (big) s.jump = 1;
    ctx.note(NOTES[i]);
    const at = s.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.2, 0));
    for (let k = 0; k < 3; k++) {
      ctx.fx.add('note', at.clone().add(new THREE.Vector3((k - 1) * 0.5, 0, 0)), { v: new THREE.Vector3((k - 1) * 0.6, 2.2, 0), life: 1.5, size: 0.7, rise: 0.2, color: s.color, spin: (k - 1) * 0.8 });
    }
  };
  const sing = async (first: boolean) => {
    phase = 'sing';
    step = 0;
    glowHint = -1;
    await ctx.say(first ? 'world.song.intro' : 'world.song.listen');
    if (phase === 'sing') t0 = clock + 0.3;
  };

  const game: Game = {
    camera: { pos: new THREE.Vector3(0, 4.2, 9.5), look: new THREE.Vector3(0, 1.3, 0) },
    kaspionSpot: new THREE.Vector3(-hw + 0.4, 5.2, -2.5),
    update(dt, t) {
      clock += dt;
      if (phase === 'intro') { newTune(); void sing(true); }
      // the shells sing the tune slowly, one note at a time
      if (phase === 'sing' && clock >= t0) {
        const i = Math.floor((clock - t0) / NOTE_GAP);
        if (i < tune.length && i >= step) { sound(tune[i]); step = i + 1; }
        if (clock - t0 >= tune.length * NOTE_GAP) {
          phase = 'listen';
          step = 0;
          idle = 0;
          void ctx.say('world.song.your');
        }
      }
      if (phase === 'listen') {
        // stuck for a moment? the shell to touch starts glowing
        idle += dt;
        glowHint = idle > 3 ? tune[step] : -1;
      }
      if (phase === 'happy') {
        wait -= dt;
        if (wait <= 0) {
          round++;
          if (round >= ctx.count) phase = 'done';
          else { newTune(); t0 = Infinity; void sing(false); }
        }
      }
      glowT += dt;
      for (const [i, s] of shells.entries()) {
        s.lit = Math.max(0, s.lit - dt * 1.3);
        s.jump = Math.max(0, s.jump - dt * 1.8);
        const hint = glowHint === i ? 0.45 + 0.35 * Math.sin(glowT * 6) : 0;
        const light = Math.max(s.lit, hint);
        const want = s.lit > 0.05 ? 1 : hint > 0 ? 0.45 : 0.15;
        s.open += (want - s.open) * Math.min(1, dt * 10);
        s.lid.rotation.x = -s.open * 1.05;
        s.halo.material.opacity = light * 0.95;
        s.mat.emissive.copy(s.mat.color).multiplyScalar(light * 0.45);
        (s.pearl.material as THREE.MeshPhysicalMaterial).emissiveIntensity = light * 1.5;
        // waiting for the child: the shells sway gently, inviting a touch
        const invite = phase === 'listen' ? Math.sin(t * 3 + i * 2) * 0.06 : 0;
        s.root.position.y = 0.4 + Math.sin(s.jump * Math.PI) * 0.9 + Math.sin(t * 2 + i) * 0.03;
        s.root.rotation.z = invite;
      }
    },
    tap(e) {
      if (e.kind !== 'down' || phase !== 'listen') return;
      const hit = pick(e.ray, shells);
      if (!hit) return;
      const i = shells.indexOf(hit as Shell);
      idle = 0;
      if (i === tune[step]) {
        sound(i);
        step++;
        if (step >= tune.length) {
          phase = 'happy';
          glowHint = -1;
          wait = 2.2;
          ctx.kaspion.cheer();
          ctx.fx.celebrate(hit.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.5, 0)), 1.1);
          ctx.praise();
        }
      } else {
        // not that one: a soft sound, then the right shell sings again and glows; carry on from here
        sound(i, false);
        ctx.sfx('bonk');
        const right = tune[step];
        setTimeout(() => { if (phase === 'listen') { sound(right); glowHint = right; idle = 3; } }, 700);
        void ctx.say('world.song.this');
      }
    },
    progress: () => ({ got: round, goal: ctx.count }),
    done: () => phase === 'done',
    hint: () => (phase === 'listen' ? shells[tune[step]].root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.8, 0)) : null),
    auto() {
      if (phase !== 'listen') return;
      const p = shells[tune[step]].root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.4, 0));
      game.tap({ kind: 'down', ray: rayTo(ctx, p), ndc: new THREE.Vector2() });
    },
    debug: () => ({ round, phase, tune, step }),
    dispose() { for (const s of shells) ctx.group.remove(s.root); geo.dispose(); },
  };
  return game;
}
