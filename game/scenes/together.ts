// PLACEHOLDER — to be implemented (read-along illustration).
import type { SceneDef } from './types';
import { cover } from './cover';

export const togetherScene: SceneDef = { id: 'together', create: api => cover.create(api) };
