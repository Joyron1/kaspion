// Hebrew points (nikud) helpers, shared by the editor, the narrator and the server.

export interface Mark { ch: string; name: string; sample: string }

// The marks a parent needs to vowel a children's text, in the order they are taught.
export const MARKS: Mark[] = [
  { ch: 'ָ', name: 'קָמָץ', sample: 'בָ' },
  { ch: 'ַ', name: 'פַּתָח', sample: 'בַ' },
  { ch: 'ֶ', name: 'סֶגּוֹל', sample: 'בֶ' },
  { ch: 'ֵ', name: 'צֵירֵי', sample: 'בֵ' },
  { ch: 'ִ', name: 'חִירִיק', sample: 'בִ' },
  { ch: 'ֹ', name: 'חוֹלָם', sample: 'בֹ' },
  { ch: 'ֻ', name: 'קֻבּוּץ', sample: 'בֻ' },
  { ch: 'ְ', name: 'שְׁוָא', sample: 'בְ' },
  { ch: 'ֱ', name: 'חֲטַף סֶגּוֹל', sample: 'אֱ' },
  { ch: 'ֲ', name: 'חֲטַף פַּתָח', sample: 'אֲ' },
  { ch: 'ֳ', name: 'חֲטַף קָמָץ', sample: 'אֳ' },
  { ch: 'ּ', name: 'דָּגֵשׁ / שׁוּרוּק', sample: 'בּ' },
  { ch: 'ׁ', name: 'שִׁין יְמָנִית', sample: 'שׁ' },
  { ch: 'ׂ', name: 'שִׂין שְׂמָאלִית', sample: 'שׂ' },
];

// U+0591–U+05C7 except the maqaf (U+05BE) and sof pasuq/punctuation that print as letters.
const POINTS = /[֑-ׇֽֿׁׂׅׄ]/g;

export function stripNikud(s: string): string {
  return s.replace(POINTS, '');
}

export function hasNikud(s: string): boolean {
  return /[ְ-ׇּׁׂ]/.test(s);
}

const isPoint = (c: string) => /[֑-ׇֽֿׁׂׅׄ]/.test(c);
const isLetter = (c: string) => /[א-ת]/.test(c);

/**
 * Insert a mark after the Hebrew letter that sits before the caret. Marks of the
 * same family (vowel vs. dagesh vs. shin dot) replace each other, so tapping
 * פתח then קמץ swaps the vowel instead of stacking two.
 */
export function applyMark(text: string, caret: number, mark: string): { text: string; caret: number } {
  // Find the letter the caret belongs to: walk back over points.
  let i = caret;
  while (i > 0 && isPoint(text[i - 1])) i--;
  const letterAt = i - 1;
  if (letterAt < 0 || !isLetter(text[letterAt])) return { text, caret };
  let end = i;
  while (end < text.length && isPoint(text[end])) end++;
  const cluster = text.slice(i, end).split('');
  const family = (c: string) => (c === 'ּ' ? 'dagesh' : c === 'ׁ' || c === 'ׂ' ? 'shin' : 'vowel');
  const f = family(mark);
  const had = cluster.includes(mark);
  const kept = cluster.filter(c => family(c) !== f);
  if (!had) kept.push(mark);
  // Canonical-ish order: shin dot, dagesh, vowel — renders the same everywhere.
  const order = { shin: 0, dagesh: 1, vowel: 2 } as const;
  kept.sort((a, b) => order[family(a)] - order[family(b)]);
  const next = text.slice(0, i) + kept.join('') + text.slice(end);
  return { text: next, caret: i + kept.length };
}

/** Remove the points from the letter before the caret. */
export function clearLetter(text: string, caret: number): { text: string; caret: number } {
  let i = caret;
  while (i > 0 && isPoint(text[i - 1])) i--;
  let end = i;
  while (end < text.length && isPoint(text[end])) end++;
  return { text: text.slice(0, i) + text.slice(end), caret: i };
}

/** Share of Hebrew letters that carry at least one point: a rough "how vowelled is this" meter. */
export function nikudCoverage(s: string): number {
  let letters = 0, pointed = 0;
  for (let k = 0; k < s.length; k++) {
    if (!isLetter(s[k])) continue;
    letters++;
    let j = k + 1, any = false;
    while (j < s.length && isPoint(s[j])) { any = true; j++; }
    // final letters and vav/yod as vowels often stay bare, so do not expect 100%
    if (any) pointed++;
  }
  return letters ? pointed / letters : 0;
}

/** Split text into words while keeping the original characters, for highlighting. */
export function words(s: string): { word: string; start: number; end: number }[] {
  const out: { word: string; start: number; end: number }[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) out.push({ word: m[0], start: m.index, end: m.index + m[0].length });
  return out;
}
