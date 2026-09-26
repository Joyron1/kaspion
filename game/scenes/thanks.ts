// PLACEHOLDER — to be implemented (read-along illustration).
import type { SceneDef } from './types';
import { cover } from './cover';

export const thanksScene: SceneDef = { id: 'thanks', create: api => cover.create(api) };
