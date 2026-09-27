import type { LineDef } from './types';

// The 3D journey: one station per story page. Between stations Kaspion swims
// while the narrator reads that page; at each station there is a mini-game.

export type GameKind = 'bubbles' | 'mom' | 'memory' | 'food' | 'pearls' | 'shadow' | 'puzzle' | 'song' | 'hide' | 'color' | 'count' | 'maze' | 'sort';
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

// Every station has its own game: 13 stations, 13 different games.
export const STATIONS: StationDef[] = [
  { id: 's01', page: 'p01', game: 'bubbles', theme: 'coral', mood: 'shallow', level: 0, title: 'הברק של כספיון', intro: 'הגענו לגן האלמוגים! חברים קטנים נתקעו בתוך בועות. בואו נעזור לכספיון לשחרר אותם.' },
  { id: 's02', page: 'p02', game: 'mom', theme: 'coral', mood: 'shallow', level: 0, title: 'משפחה גדולה', intro: 'כספיון אוהב את המשפחה שלו. גם לחיות הים יש משפחות. בואו נעזור להן להתאחד.' },
  { id: 's03', page: 'p03', game: 'memory', theme: 'coral', mood: 'blue', level: 0.1, title: 'חברים בים', intro: 'החברים של כספיון מתחבאים בצדפים. בואו נמצא אותם!' },
  { id: 's04', page: 'p04', game: 'food', theme: 'sparse', mood: 'blue', level: 0.2, title: 'רחוק מתמיד', intro: 'כספיון יוצא לדרך ארוכה, רחוק רחוק. בואו נאסוף לו אוכל לדרך.' },
  { id: 's05', page: 'p05', game: 'pearls', theme: 'rocks', mood: 'deep', level: 0.3, title: 'הר באמצע הים', intro: 'כאן עמוק וחשוך. בואו נאסוף פנינים זוהרות שיאירו לנו את הים.' },
  { id: 's06', page: 'p06', game: 'shadow', theme: 'rocks', mood: 'deep', level: 0.4, title: 'להר יש עין', intro: 'שמעתם? ההר הוא בכלל לוויתן! בואו נשחק איתו בצללים.' },
  { id: 's07', page: 'p07', game: 'puzzle', theme: 'sparse', mood: 'deep', level: 0.4, title: 'לוויתן קטן', intro: 'הלוויתן הקטן עצוב. בואו נשמח אותו ונבנה חברים מחלקים.' },
  { id: 's08', page: 'p08', game: 'song', theme: 'coral', mood: 'blue', level: 0.5, title: 'קוראים למשפחה', intro: 'כספיון קורא לכל המשפחה בשיר. הצדפים שרים, ואתם עונים להם.' },
  { id: 's09', page: 'p09', game: 'hide', theme: 'kelp', mood: 'blue', level: 0.6, title: 'לכל עבר', intro: 'הדגים הכסופים מחפשים בכל מקום. גם אנחנו נחפש! מי מתחבא פה?' },
  { id: 's10', page: 'p10', game: 'color', theme: 'kelp', mood: 'blue', level: 0.6, title: 'לא נשאר לבד', intro: 'כספיון והלוויתן מחכים יחד. כדי שלא ישתעממו, בואו נצבע!' },
  { id: 's11', page: 'p11', game: 'count', theme: 'coral', mood: 'dusk', level: 0.8, title: 'אבא ואמא!', intro: 'כל הדגים חזרו, ואיתם אבא ואמא! בואו נספור: איפה יש יותר ואיפה פחות?' },
  { id: 's12', page: 'p12', game: 'maze', theme: 'glow', mood: 'night', level: 0.9, title: 'תודה ולילה טוב', intro: 'לילה טוב, ים! עזרו לכספיון לשחות הביתה דרך מבוך האלמוגים.' },
  { id: 's13', page: 'p13', game: 'sort', theme: 'coral', mood: 'shallow', level: 1, title: 'חברים טובים', intro: 'בוקר חדש ומסיבה בים! כל דג שוחה אל הבית בצבע שלו.' },
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
  'bubbles.intro': { label: 'בועות: הסבר', text: 'נוגעים במסך, וכספיון שוחה לשם. שחו אל הבועה הגדולה ופוצצו אותה!' },
  'food.intro':    { label: 'אוכל לדרך: הסבר', text: 'אוכל טעים יורד מלמעלה. נוגעים במסך, וכספיון שוחה לתפוס אותו.' },
  'food.eat':      { label: 'אוכל לדרך: כספיון אוכל', text: 'יאם! כספיון אכל חטיף מהדרך, ויש לו כוח לשחות.' },
  'pearls.intro':  { label: 'פנינים: הסבר', text: 'חשוך כאן! געו בפנינה זוהרת, וכספיון יביא אותה אל הצדף הגדול.' },
  'puzzle.intro':  { label: 'פאזל: הסבר', text: 'החבר התפרק לארבעה חלקים. גררו כל חלק אל הצל שעל הסלע.' },
  'puzzle.again':  { label: 'פאזל: עוד חבר', text: 'יופי! הנה עוד חבר לבנות.' },
  'song.intro':    { label: 'שיר הצדפים: הסבר', text: 'הצדפים שרים! הסתכלו איזה צדף קופץ ושר, ואחר כך געו בו.' },
  'song.listen':   { label: 'שיר הצדפים: הקשיבו', text: 'הקשיבו טוב.' },
  'song.your':     { label: 'שיר הצדפים: תורכם', text: 'עכשיו תורכם! געו בצדף ששר.' },
  'song.this':     { label: 'שיר הצדפים: הצדף הזה', text: 'הקשיבו, הצדף הזה!' },
  'hide.intro':    { label: 'מחבואים: הסבר', text: 'חבר מתחבא מאחורי אחד הסלעים. הסתכלו טוב, ומי שמציץ, געו בו!' },
  'hide.again':    { label: 'מחבואים: עוד סיבוב', text: 'עוד פעם! מי מתחבא עכשיו?' },
  'hide.empty':    { label: 'מחבואים: אין כאן', text: 'אין כאן אף אחד.' },
  'count.intro':   { label: 'כמויות: הסבר', text: 'יש כאן שתי קבוצות של חברים.' },
  'count.more':    { label: 'כמויות: איפה יותר', text: 'איפה יש יותר?' },
  'count.less':    { label: 'כמויות: איפה פחות', text: 'איפה יש פחות?' },
  'sort.intro':    { label: 'בתים צבעוניים: הסבר', text: 'כל דג גר בבית בצבע שלו. גררו את הדג אל הבית שלו.' },
  'sort.try':      { label: 'בתים צבעוניים: לא הבית', text: 'זה לא הבית שלו. מה הצבע של הדג?' },
};

export const WORLD_LINES: LineDef[] = [
  ...Object.entries(WORLD_TEXTS).map(([k, v]) => ({ key: `world.${k}`, group: 'world' as const, section: 'המסע בתלת־ממד: משחקים', label: v.label, text: v.text })),
  ...STATIONS.flatMap((s, i) => [
    { key: `world.${s.id}.title`, group: 'world' as const, section: `המסע: תחנה ${i + 1}`, label: 'שם התחנה', text: s.title },
    { key: `world.${s.id}.intro`, group: 'world' as const, section: `המסע: תחנה ${i + 1}`, label: 'כשמגיעים לתחנה', text: s.intro },
  ]),
];
