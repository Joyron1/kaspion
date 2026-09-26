// PLACEHOLDER — to be implemented (read-along illustration).
import type { SceneDef } from './types';
import { cover } from './cover';

export const mountainScene: SceneDef = { id: 'mountain', create: api => cover.create(api) };
