import 'server-only';
import { db, publicAudioUrl } from '../supabase';
import { activeTtsProvider } from '../env';
import { allLineDefs } from './registry';
import { LEVELS } from './levels';
import { DEFAULT_NARRATOR, type ContentBundle, type Line, type Lines, type NarratorSettings } from './types';

interface LineRow {
  key: string;
  text: string | null;
  speech: string | null;
  audio_path: string | null;
  audio_source: Line['audioSource'];
  audio_for: string | null;
  reviewed: boolean;
  updated_at: string;
}

interface SettingRow { key: string; value: Record<string, unknown> }

/** All texts with the parent's edits applied, plus tuning and narrator settings. */
export async function loadContent(): Promise<ContentBundle> {
  const client = db();
  let rows: LineRow[] = [];
  let settings: SettingRow[] = [];
  if (client) {
    const [l, s] = await Promise.all([
      client.from('lines').select('*'),
      client.from('settings').select('key,value'),
    ]);
    if (!l.error && l.data) rows = l.data as LineRow[];
    if (!s.error && s.data) settings = s.data as SettingRow[];
  }
  const byKey = new Map(rows.map(r => [r.key, r]));

  const lines: Lines = {};
  for (const def of allLineDefs()) {
    const r = byKey.get(def.key);
    const text = r?.text?.trim() ? r.text : def.text;
    const speech = r?.speech?.trim() ? r.speech : text;
    const fresh = Boolean(r?.audio_path) && (r?.audio_source !== 'tts' || r?.audio_for === speech);
    lines[def.key] = {
      key: def.key,
      text,
      speech,
      audioUrl: fresh ? publicAudioUrl(r!.audio_path, r!.updated_at) : null,
      audioSource: fresh ? r!.audio_source : null,
      audioStale: Boolean(r?.audio_path) && !fresh,
      edited: Boolean(r?.text?.trim() || r?.speech?.trim()),
      reviewed: Boolean(r?.reviewed),
    };
  }

  const levelConfig: ContentBundle['levelConfig'] = {};
  for (const lv of LEVELS) {
    const saved = settings.find(s => s.key === `level.${lv.id}`)?.value ?? {};
    const cfg: Record<string, number> = { ...lv.config };
    for (const [k, knob] of Object.entries(lv.knobs)) {
      const v = Number((saved as Record<string, unknown>)[k]);
      if (Number.isFinite(v)) cfg[k] = Math.min(knob.max, Math.max(knob.min, v));
    }
    levelConfig[lv.id] = cfg;
  }

  const savedNarrator = settings.find(s => s.key === 'narrator')?.value ?? {};
  const narrator: NarratorSettings = { ...DEFAULT_NARRATOR, ...(savedNarrator as Partial<NarratorSettings>) };

  return { lines, levelConfig, narrator, cloudVoice: activeTtsProvider() !== null };
}
