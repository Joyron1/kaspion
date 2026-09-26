// PLACEHOLDER — to be implemented.
import type { LevelDef } from '../engine/types';
import { silver } from './silver';

export const call: LevelDef = { id: 'call', create: g => silver.create(g) };
