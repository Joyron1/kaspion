// PLACEHOLDER — to be implemented (read-along illustration).
import type { SceneDef } from './types';
import { cover } from './cover';

export const silverScene: SceneDef = { id: 'silver', create: api => cover.create(api) };
