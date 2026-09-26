// PLACEHOLDER — to be implemented (read-along illustration).
import type { SceneDef } from './types';
import { cover } from './cover';

export const companyScene: SceneDef = { id: 'company', create: api => cover.create(api) };
