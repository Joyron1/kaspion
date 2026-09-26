// PLACEHOLDER — to be implemented (read-along illustration).
import type { SceneDef } from './types';
import { cover } from './cover';

export const callScene: SceneDef = { id: 'call', create: api => cover.create(api) };
