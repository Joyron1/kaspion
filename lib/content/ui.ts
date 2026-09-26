import type { LineDef } from './types';

// Short interface phrases that the narrator also says out loud.
export const UI_TEXTS: Record<string, { label: string; text: string }> = {
  'app.title':      { label: 'שם המשחק', text: 'כספיון' },
  'app.tagline':    { label: 'שורת פתיחה', text: 'הרפתקה קטנה מתחת לים' },
  'home.play':      { label: 'כפתור משחק', text: 'בואו נשחק' },
  'home.read':      { label: 'כפתור קריאה', text: 'קוראים יחד' },
  'touch.hint':     { label: 'הסבר שליטה', text: 'נוגעים במסך, וכספיון שוחה אל האצבע.' },
  'praise.1':       { label: 'מחמאה 1', text: 'יופי!' },
  'praise.2':       { label: 'מחמאה 2', text: 'מצוין!' },
  'praise.3':       { label: 'מחמאה 3', text: 'כל הכבוד!' },
  'praise.4':       { label: 'מחמאה 4', text: 'איזה יופי!' },
  'praise.5':       { label: 'מחמאה 5', text: 'וואו, איזה אלוף!' },
  'level.done':     { label: 'סוף שלב', text: 'כל הכבוד! סיימת את השלב.' },
  'level.next':     { label: 'לשלב הבא', text: 'לשלב הבא' },
  'level.again':    { label: 'שוב', text: 'לשחק שוב' },
  'idle.hint':      { label: 'רמז כשהילד תקוע', text: 'רוצה עזרה? שחה לאן שהחץ מראה.' },
  'read.start':     { label: 'התחלת קריאה', text: 'בואו נקרא יחד את הסיפור.' },
  'read.end':       { label: 'סוף הסיפור', text: 'סוף.' },
};

export const UI_LINES: LineDef[] = Object.entries(UI_TEXTS).map(([k, v]) => ({
  key: `ui.${k}`,
  group: 'ui',
  section: 'ממשק',
  label: v.label,
  text: v.text,
}));
