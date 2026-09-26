// Shared content types (server + client).

export type LineGroup = 'story' | 'level' | 'ui' | 'world';

/** A text the app can show and narrate, with its default wording from code. */
export interface LineDef {
  key: string;
  group: LineGroup;
  section: string; // page or level title, for grouping in the editor
  label: string;   // what the line is for ("פתיח", "רמז", "עמוד 3")
  text: string;
}

/** A text after merging the parent's edits over the default. */
export interface Line {
  key: string;
  text: string;           // what is shown (may carry nikud)
  speech: string;         // what the narrator says (defaults to text)
  audioUrl: string | null; // recorded / uploaded / generated audio for this exact speech
  audioSource: 'recorded' | 'uploaded' | 'tts' | null;
  audioStale: boolean;    // audio exists but was made for an older wording
  edited: boolean;
  reviewed: boolean;
}

export type Lines = Record<string, Line>;

export interface StoryPage {
  id: string;     // 'p01'
  title: string;  // short name for the editor and the level map
  scene: string;  // animated scene id in game/scenes
  text: string;   // default page text (own words, not the book's)
}

export interface LevelKnob {
  label: string;
  min: number;
  max: number;
  step?: number;
}

export interface LevelMeta {
  id: string;
  title: string;
  pages: string[];              // story pages this level is built on
  blurb: string;                // one line for the level map
  texts: Record<string, string>; // name -> default text; keys become level.<id>.<name>
  config: Record<string, number>; // default tuning knobs
  knobs: Record<string, LevelKnob>;
}

export interface NarratorSettings {
  rate: number;         // browser voice speed
  pitch: number;        // browser voice pitch
  preferCloud: boolean; // use the server voice when configured
}

export const DEFAULT_NARRATOR: NarratorSettings = { rate: 0.9, pitch: 1.05, preferCloud: true };

export interface ContentBundle {
  lines: Lines;
  levelConfig: Record<string, Record<string, number>>;
  narrator: NarratorSettings;
  cloudVoice: boolean; // a server TTS provider is configured
}
