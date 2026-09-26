// Development previews of the cast and the sea (see app/dev/world).

import * as THREE from 'three';
import { Stage } from './core/stage';
import { Ocean, Garden, mood } from './env/ocean';
import { makeCreature, makeWhale, type Creature, type Kind } from './characters';

export function preview(canvas: HTMLCanvasElement, view: string): () => void {
  const stage = new Stage(canvas);
  const ocean = new Ocean(stage, { length: 200, width: 160, flats: [{ x: 0, z: 0, r: 12 }] });
  const garden = new Garden(stage.scene, stage.lowPower);
  garden.plant(0, 0, 12, 30, 'coral', 3, (x, z) => ocean.height(x, z));
  const m = mood(view === 'night' ? 'night' : 'blue');
  const cast: Creature[] = [];
  if (view === 'cast' || view === 'night') {
    const kinds: Kind[] = ['kaspion', 'fish', 'crab', 'octopus', 'seahorse', 'turtle', 'starfish', 'jelly'];
    kinds.forEach((k, i) => {
      const c = makeCreature(k);
      c.root.position.set((i % 4 - 1.5) * 3.2, i < 4 ? 4.2 : 0.4, i < 4 ? -1 : 1.5);
      if (k === 'kaspion' || k === 'fish' || k === 'turtle' || k === 'seahorse') c.root.rotation.y = -0.5;
      stage.scene.add(c.root);
      cast.push(c);
    });
    stage.camera.position.set(0, 5, 15);
    stage.focus.set(0, 2.6, 0);
  } else if (view === 'whales') {
    const roles = ['papa', 'mama', 'baby'] as const;
    roles.forEach((r, i) => {
      const w = makeWhale({ role: r });
      w.root.position.set((i - 1) * 7, 3 + i * 0.5, -i * 2);
      w.root.rotation.y = -0.4;
      stage.scene.add(w.root);
      cast.push(w);
    });
    const k = makeCreature('kaspion');
    k.root.position.set(4, 3, 4);
    k.root.rotation.y = 2.6;
    stage.scene.add(k.root);
    cast.push(k);
    stage.camera.position.set(0, 5, 20);
    stage.focus.set(0, 3, 0);
  } else if (view === 'paint') {
    (['fish', 'whale', 'crab', 'turtle'] as Kind[]).forEach((k, i) => {
      const c = makeCreature(k, { paint: true });
      c.root.position.set((i - 1.5) * 4, 2, 0);
      stage.scene.add(c.root);
      cast.push(c);
    });
    stage.camera.position.set(0, 4, 14);
    stage.focus.set(0, 2, 0);
  }
  stage.camera.lookAt(stage.focus);
  stage.onTick((dt, t) => {
    ocean.follow(m, 10);
    for (const c of cast) { c.swim = 0.5 + Math.sin(t) * 0.5; c.update(dt, t); }
  });
  stage.start();
  (window as unknown as { __three: typeof THREE }).__three = THREE;
  return () => stage.dispose();
}
