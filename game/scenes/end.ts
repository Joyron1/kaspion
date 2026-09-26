// PLACEHOLDER — to be implemented (read-along illustration).
import type { SceneDef } from './types';
import { cover } from './cover';

export const endScene: SceneDef = { id: 'end', create: api => cover.create(api) };
