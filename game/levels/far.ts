// PLACEHOLDER — to be implemented. See lib/content/levels.ts for this level's texts and knobs.
import type { LevelDef } from '../engine/types';
import { silver } from './silver';

export const far: LevelDef = { id: 'far', create: g => silver.create(g) };
