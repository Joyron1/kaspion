// PLACEHOLDER — to be implemented (read-along illustration).
import type { SceneDef } from './types';
import { cover } from './cover';

export const searchScene: SceneDef = { id: 'search', create: api => cover.create(api) };
