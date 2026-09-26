import type { LineDef } from './types';

// The 3D journey: one station per story page. Between stations Kaspion swims
// while the narrator reads that page; at each station there is a mini-game.

export type GameKind = 'shadow' | 'mom' | 'memory' | 'maze' | 'color';
export type WorldTheme = 'coral' | 'kelp' | 'rocks' | 'sparse' | 'glow';
export type WorldMood = 'shallow' | 'blue' | 'deep' | 'dusk' | 'night';

export interface StationDef {
  id: string;        // 's01'
  page: string;      // story page read on the way here
  game: GameKind;
  theme: WorldTheme;
  mood: WorldMood;
  /** 0 = easiest, 1 = hardest */
  level: number;
  title: string;
  intro: string;     // said when Kaspion arrives, before the game
}

export const STATIONS: StationDef[] = [
  { id: 's01', page: 'p01', game: 'shadow', theme: 'coral', mood: 'shallow', level: 0, title: 'הברק של כספיון', intro: 'הגענו לגן האלמוגים! על הסלע הגדול יש צללים. בואו נגלה של מי הם.' },
  { id: 's02', page: 'p02', game: 'mom', theme: 'coral', mood: 'shallow', level: 0, title: 'משפחה גדולה', intro: 'כספיון אוהב את המשפחה שלו. גם לחיות הים יש משפחות. בואו נעזור להן להתאחד.' },
  { id: 's03', page: 'p03', game: 'memory', theme: 'coral', mood: 'blue', level: 0, title: 'חברים בים', intro: 'החברים של כספיון מתחבאים בצדפים. בואו נמצא אותם!' },
  { id: 's04', page: 'p04', game: 'maze', theme: 'rocks', mood: 'blue', level: 0.1, title: 'רחוק מתמיד', intro: 'כספיון שחה רחוק רחוק, אל מבוך של אלמוגים. עזרו לו למצוא את הדרך.' },
  { id: 's05', page: 'p05', game: 'color', theme: 'rocks', mood: 'deep', level: 0.2, title: 'הר באמצע הים', intro: 'כאן הכול אפור וחיוור. בואו נצבע את החברים של כספיון.' },
  { id: 's06', page: 'p06', game: 'shadow', theme: 'rocks', mood: 'deep', level: 0.4, title: 'להר יש עין', intro: 'שמעתם? ההר הוא בכלל לוויתן! בואו נשחק איתו בצללים.' },
  { id: 's07', page: 'p07', game: 'mom', theme: 'sparse', mood: 'deep', level: 0.4, title: 'לוויתן קטן', intro: 'הלוויתן הקטן מתגעגע לאמא. בואו נעזור לכל התינוקות למצוא את אמא שלהם.' },
  { id: 's08', page: 'p08', game: 'memory', theme: 'coral', mood: 'blue', level: 0.5, title: 'קוראים למשפחה', intro: 'כספיון קורא לכל המשפחה. הם מתחבאים בצדפים. בואו נמצא זוגות!' },
  { id: 's09', page: 'p09', game: 'maze', theme: 'kelp', mood: 'blue', level: 0.6, title: 'לכל עבר', intro: 'הדגים הכסופים מחפשים בכל מקום, גם ביער האצות. עזרו לכספיון לחפש.' },
  { id: 's10', page: 'p10', game: 'color', theme: 'kelp', mood: 'blue', level: 0.6, title: 'לא נשאר לבד', intro: 'כספיון והלוויתן מחכים יחד. כדי שלא ישתעממו, בואו נצבע!' },
  { id: 's11', page: 'p11', game: 'mom', theme: 'coral', mood: 'dusk', level: 0.8, title: 'אבא ואמא!', intro: 'אבא ואמא של הלוויתן כאן! עכשיו נעזור לכל התינוקות בים למצוא את אמא.' },
  { id: 's12', page: 'p12', game: 'memory', theme: 'glow', mood: 'night', level: 0.9, title: 'תודה ולילה טוב', intro: 'הלילה ירד, והצדפים זוהרים. בואו נמצא עוד זוגות לפני השינה.' },
  { id: 's13', page: 'p13', game: 'maze', theme: 'coral', mood: 'shallow', level: 1, title: 'חברים טובים', intro: 'בוקר חדש! כספיון והלוויתן משחקים במבוך. עזרו להם להיפגש.' },
];

// Words the narrator says during the games. Every one can be edited and vowelled.
export const WORLD_TEXTS: Record<string, { label: string; text: string }> = {
  'start':        { label: 'פתיחת המסע', text: 'בואו נצא למסע עם כספיון, אל מעמקי הים!' },
  'travel':       { label: 'ממשיכים לשחות', text: 'ממשיכים במסע!' },
  'win':          { label: 'סוף משימה', text: 'כל הכבוד! המשימה הושלמה.' },
  'try':          { label: 'טעות קטנה', text: 'כמעט! נסו שוב.' },
  'hint':         { label: 'רמז', text: 'רוצים עזרה? הנה, כאן!' },
  'end':          { label: 'סוף המסע', text: 'סוף המסע! כספיון והלוויתן הם החברים הכי טובים בים.' },
  'shadow.intro': { label: 'צללים: הסבר', text: 'על הסלע יש צל. למי הוא שייך? געו בחיה הנכונה.' },
  'shadow.ask':   { label: 'צללים: שאלה', text: 'ולמי הצל הזה?' },
  'mom.intro':    { label: 'אמא וגור: הסבר', text: 'התינוקות הלכו לאיבוד! געו בתינוק של אמא, והוא ישחה אליה.' },
  'mom.ask':      { label: 'אמא וגור: שאלה', text: 'מי התינוק של אמא הזאת?' },
  'memory.intro': { label: 'זיכרון: הסבר', text: 'בתוך הצדפים מתחבאים חברים. פותחים שני צדפים ומחפשים שניים שדומים.' },
  'memory.again': { label: 'זיכרון: עוד לוח', text: 'יופי! הנה עוד צדפים.' },
  'memory.pair':  { label: 'זיכרון: זוג', text: 'זוג!' },
  'maze.intro':   { label: 'מבוך: הסבר', text: 'עזרו לכספיון לשחות במבוך. שמים אצבע על המסך, וכספיון שוחה אליה.' },
  'maze.again':   { label: 'מבוך: עוד מבוך', text: 'מצוין! הנה מבוך חדש.' },
  'maze.found':   { label: 'מבוך: מצאנו', text: 'מצאנו חבר!' },
  'color.intro':  { label: 'צביעה: הסבר', text: 'בוחרים צבע בבועה, ונוגעים בחיה כדי לצבוע אותה.' },
  'color.done':   { label: 'צביעה: סיום חיה', text: 'איזה יופי של צבעים!' },
  'color.next':   { label: 'צביעה: עוד חיה', text: 'הנה עוד חבר לצבוע.' },
};

export const WORLD_LINES: LineDef[] = [
  ...Object.entries(WORLD_TEXTS).map(([k, v]) => ({ key: `world.${k}`, group: 'world' as const, section: 'המסע בתלת־ממד: משחקים', label: v.label, text: v.text })),
  ...STATIONS.flatMap((s, i) => [
    { key: `world.${s.id}.title`, group: 'world' as const, section: `המסע: תחנה ${i + 1}`, label: 'שם התחנה', text: s.title },
    { key: `world.${s.id}.intro`, group: 'world' as const, section: `המסע: תחנה ${i + 1}`, label: 'כשמגיעים לתחנה', text: s.intro },
  ]),
];
