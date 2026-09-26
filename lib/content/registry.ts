import type { LineDef } from './types';
import { STORY_PAGES } from './story';
import { LEVELS } from './levels';
import { UI_LINES } from './ui';
import { WORLD_LINES } from './world';

// Level text names get a Hebrew label in the editor; unknown names show as is.
const LEVEL_LABELS: Record<string, string> = {
  title: 'שם השלב',
  intro: 'פתיח (מוקרא לפני השלב)',
  hint: 'הסבר קצר לילד',
  win: 'סיום השלב',
};

export function levelLabel(name: string): string {
  if (LEVEL_LABELS[name]) return LEVEL_LABELS[name];
  const m = /^stage(\d+)$/.exec(name);
  if (m) return `משימה ${m[1]}`;
  const t = /^toast\.(.+)$/.exec(name);
  if (t) return `קריאה קצרה: ${t[1]}`;
  return name;
}

/** Every narratable text in the app, with its default wording. */
export function allLineDefs(): LineDef[] {
  const story: LineDef[] = STORY_PAGES.map((p, i) => ({
    key: `story.${p.id}`,
    group: 'story',
    section: 'הסיפור',
    label: `עמוד ${i + 1}: ${p.title}`,
    text: p.text,
  }));
  const levels: LineDef[] = LEVELS.flatMap((lv, i) => [
    { key: `level.${lv.id}.title`, group: 'level' as const, section: `שלב ${i + 1}`, label: levelLabel('title'), text: lv.title },
    ...Object.entries(lv.texts).map(([name, text]) => ({
      key: `level.${lv.id}.${name}`,
      group: 'level' as const,
      section: `שלב ${i + 1}`,
      label: levelLabel(name),
      text,
    })),
  ]);
  return [...story, ...levels, ...WORLD_LINES, ...UI_LINES];
}
