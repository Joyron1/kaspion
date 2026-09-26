// PLACEHOLDER — to be implemented (read-along illustration).
import type { SceneDef } from './types';
import { cover } from './cover';

export const promiseScene: SceneDef = { id: 'promise', create: api => cover.create(api) };
