// PLACEHOLDER — to be implemented (read-along illustration).
import type { SceneDef } from './types';
import { cover } from './cover';

export const familyScene: SceneDef = { id: 'family', create: api => cover.create(api) };
