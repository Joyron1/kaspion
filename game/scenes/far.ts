// PLACEHOLDER — to be implemented (read-along illustration).
import type { SceneDef } from './types';
import { cover } from './cover';

export const farScene: SceneDef = { id: 'far', create: api => cover.create(api) };
