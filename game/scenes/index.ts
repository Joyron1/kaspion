import type { SceneDef } from './types';
import { cover } from './cover';
import { silverScene } from './silver';
import { familyScene } from './family';
import { friendsScene } from './friends';
import { farScene } from './far';
import { mountainScene } from './mountain';
import { eyeScene } from './eye';
import { promiseScene } from './promise';
import { callScene } from './call';
import { searchScene } from './search';
import { companyScene } from './company';
import { parentsScene } from './parents';
import { thanksScene } from './thanks';
import { togetherScene } from './together';
import { endScene } from './end';

/** Scene id (see lib/content/story.ts) → animated illustration. */
export const SCENES: Record<string, SceneDef> = {
  cover,
  silver: silverScene,
  family: familyScene,
  friends: friendsScene,
  far: farScene,
  mountain: mountainScene,
  eye: eyeScene,
  promise: promiseScene,
  call: callScene,
  search: searchScene,
  company: companyScene,
  parents: parentsScene,
  thanks: thanksScene,
  together: togetherScene,
  end: endScene,
};
