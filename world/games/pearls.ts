// Pearls of light: it is dark down here. Glowing pearls lie on the sand; touch one and
// Kaspion swims to fetch it into the big lamp-shell. Every pearl makes the sea brighter,
// until everything is lit again (and the "mountain" behind shows itself).

import * as THREE from 'three';
import { clay } from '../core/shade';
import { softDot } from '../core/tex';
import { pick, swimTo, type Ctx, type Game } from './kit';

interface Pearl { root: THREE.Group; ball: THREE.Mesh; halo: THREE.Sprite; home: THREE.Vector3; state: 'wait' | 'fetch' | 'fly' | 'home'; ph: number }

export function pearlsGame(ctx: Ctx): Game {
  const hw = Math.min(7, ctx.halfWidth(0) * 0.9);
  const k = ctx.kaspion;
  const pearlGeo = new THREE.SphereGeometry(0.32, 24, 16);
  const pearlMat = new THREE.MeshPhysicalMaterial({ color: '#fff6fb', roughness: 0.1, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.7, emissive: '#ffe7a8', emissiveIntensity: 1.3 });
  // glows are drawn over the sand (not cut by it)
  const haloMat = new THREE.SpriteMaterial({ map: softDot(), color: '#ffe9a8', transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, opacity: 0.9 });

  // the lamp: a big open shell at the back that glows brighter with every pearl
  const lamp = new THREE.Group();
  const shellMat = clay('#ffc6d9', { rough: 0.35, emissive: '#000000' });
  shellMat.side = THREE.DoubleSide;
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(1.4, 32, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), shellMat);
  bowl.scale.set(1, 0.5, 0.8);
  lamp.add(bowl);
  const lid = new THREE.Mesh(new THREE.SphereGeometry(1.4, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), shellMat);
  lid.scale.set(1, 0.5, 0.8);
  lid.position.set(0, 0.05, -1.1);
  lid.rotation.x = -1.2;
  lamp.add(lid);
  const glowMat = new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.2 });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 16), glowMat);
  glow.scale.set(1, 0.5, 0.8);
  glow.position.y = 0.15;
  lamp.add(glow);
  const lampHalo = new THREE.Sprite(haloMat.clone());
  lampHalo.position.y = 0.6;
  lamp.add(lampHalo);
  lamp.position.set(0, 0.2, -4);
  ctx.group.add(lamp);

  const pearls: Pearl[] = [];
  for (let i = 0; i < ctx.count; i++) {
    const root = new THREE.Group();
    const ball = new THREE.Mesh(pearlGeo, pearlMat);
    ball.castShadow = true;
    const halo = new THREE.Sprite(haloMat);
    halo.scale.setScalar(1.8);
    halo.renderOrder = 6;
    halo.position.y = 0.15;
    root.add(ball, halo);
    // spread in front of the camera, half hidden among the sand ripples
    const a = (i + 0.5) / ctx.count;
    const home = new THREE.Vector3((a - 0.5) * hw * 1.7, 0.35, (i % 2 ? 2.2 : -0.4) + Math.sin(i * 2.3) * 0.6);
    root.position.copy(home);
    ctx.group.add(root);
    pearls.push({ root, ball, halo, home, state: 'wait', ph: i * 1.7 });
  }
  let got = 0, current: Pearl | null = null, intro = true, endT = 0;
  const lampAt = () => lamp.position.clone().add(new THREE.Vector3(0, 0.5, 0));

  const choose = (p: Pearl) => {
    if (current || p.state !== 'wait') return;
    current = p;
    p.state = 'fetch';
    ctx.sfx('tap');
  };

  const game: Game = {
    camera: { pos: new THREE.Vector3(0, 6.2, 11.5), look: new THREE.Vector3(0, 0.8, -0.8) },
    kaspionSpot: null,
    darkness: () => 1 - (got / ctx.count) * 0.97,
    update(dt, t) {
      if (intro) { intro = false; void ctx.say('world.pearls.intro'); }
      for (const p of pearls) {
        if (p.state === 'wait') {
          const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + p.ph);
          p.halo.scale.setScalar(1.4 + pulse * 0.8);
          p.root.position.y = p.home.y + Math.sin(t * 1.5 + p.ph) * 0.05;
        }
      }
      if (current) {
        const p = current;
        if (p.state === 'fetch') {
          // Kaspion swims to the pearl, picks it up
          const at = p.root.position.clone().add(new THREE.Vector3(0, 0.6, 0));
          if (swimTo(k, at, dt, 7)) { p.state = 'fly'; ctx.sfx('shell'); }
        } else if (p.state === 'fly') {
          // ...and carries it to the lamp
          const mouth = k.root.position.clone().add(new THREE.Vector3(0.5, -0.1, 0));
          p.root.position.lerp(mouth, Math.min(1, dt * 10));
          if (swimTo(k, lampAt().add(new THREE.Vector3(0, 1.4, 0.8)), dt, 6)) {
            p.state = 'home';
            p.root.position.copy(lampAt().add(new THREE.Vector3((got % 3 - 1) * 0.45, 0, (Math.floor(got / 3) - 0.5) * 0.35)));
            p.halo.scale.setScalar(1.2);
            got++;
            current = null;
            k.cheer();
            ctx.fx.celebrate(lamp.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1, 0)), 0.9);
            ctx.sfx('sparkle');
            ctx.praise();
            if (got >= ctx.count) endT = 2.2;
          }
        }
      } else if (got < ctx.count) {
        // wait above the lamp
        swimTo(k, lampAt().add(new THREE.Vector3(-1.6, 2.2, 1)), dt, 4);
      }
      const light = got / ctx.count;
      glowMat.opacity = 0.2 + light * 0.7;
      lampHalo.scale.setScalar(2 + light * 5);
      shellMat.emissive.setRGB(light * 0.35, light * 0.25, light * 0.3);
      if (endT > 0) endT -= dt;
    },
    tap(e) {
      if (e.kind !== 'down' || current) return;
      const hit = pick(e.ray, pearls.filter(p => p.state === 'wait'));
      if (hit) choose(hit as Pearl);
    },
    progress: () => ({ got, goal: ctx.count }),
    done: () => got >= ctx.count && endT <= 0,
    hint: () => {
      const p = pearls.find(x => x.state === 'wait');
      return !current && p ? p.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1, 0)) : null;
    },
    auto() { const p = pearls.find(x => x.state === 'wait'); if (p) choose(p); },
    dispose() {
      for (const p of pearls) ctx.group.remove(p.root);
      ctx.group.remove(lamp);
      pearlGeo.dispose();
    },
  };
  return game;
}
