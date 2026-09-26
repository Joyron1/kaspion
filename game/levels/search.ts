// PLACEHOLDER — to be implemented.
import type { LevelDef } from '../engine/types';
import { silver } from './silver';

export const search: LevelDef = { id: 'search', create: g => silver.create(g) };
