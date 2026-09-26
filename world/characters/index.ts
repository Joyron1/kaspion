import type { Creature, Kind } from './parts';
import { makeFish, makeKaspion } from './fish';
import { makeWhale } from './whale';
import { makeCrab, makeJelly, makeOctopus, makeSeahorse, makeStarfish, makeTurtle } from './critters';

export type { Creature, Kind } from './parts';
export { makeFish, makeKaspion, makeWhale, makeCrab, makeJelly, makeOctopus, makeSeahorse, makeStarfish, makeTurtle };

export interface MakeOpts { baby?: boolean; paint?: boolean; mama?: boolean }

/** Build any creature by kind. Grown-ups are bigger; babies are small with bigger eyes. */
export function makeCreature(kind: Kind, o: MakeOpts = {}): Creature {
  switch (kind) {
    case 'kaspion': return makeKaspion();
    case 'fish': return makeFish({ color: o.mama ? '#ff7a4d' : '#ffa24d', belly: '#fff0d9', baby: o.baby, paint: o.paint });
    case 'whale': return makeWhale({ role: o.baby ? 'baby' : o.mama ? 'mama' : 'baby', paint: o.paint });
    case 'crab': return makeCrab(o);
    case 'octopus': return makeOctopus(o);
    case 'seahorse': return makeSeahorse(o);
    case 'turtle': return makeTurtle(o);
    case 'starfish': return makeStarfish(o);
    case 'jelly': return makeJelly(o);
  }
}

/** Hebrew names, for the narrator. */
export const KIND_NAME: Record<Kind, string> = {
  kaspion: 'כספיון', fish: 'דג', whale: 'לוויתן', crab: 'סרטן', octopus: 'תמנון',
  seahorse: 'סוסון ים', turtle: 'צב ים', starfish: 'כוכב ים', jelly: 'מדוזה',
};
