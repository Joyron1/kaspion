import type { LevelDef } from '../engine/types';
import { silver } from './silver';
import { family } from './family';
import { friends } from './friends';
import { far } from './far';
import { mountain } from './mountain';
import { eye } from './eye';
import { promise } from './promise';
import { call } from './call';
import { search } from './search';
import { company } from './company';
import { parents } from './parents';
import { thanks } from './thanks';
import { together } from './together';

/** Level id (see lib/content/levels.ts) → implementation. */
export const LEVEL_DEFS: Record<string, LevelDef> = {
  silver, family, friends, far, mountain, eye, promise, call, search, company, parents, thanks, together,
};
