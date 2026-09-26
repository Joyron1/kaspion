// PLACEHOLDER — to be implemented.
import type { LevelDef } from '../engine/types';
import { silver } from './silver';

export const company: LevelDef = { id: 'company', create: g => silver.create(g) };
