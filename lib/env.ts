import 'server-only';

// Every integration is optional: without Supabase the game runs on the texts in
// code, and without a voice provider the browser's own Hebrew voice narrates.

export const env = {
  supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  authSecret: process.env.AUTH_SECRET || '',
  ttsProvider: (process.env.TTS_PROVIDER || '').toLowerCase() as TtsProviderName | '',
  azureKey: process.env.AZURE_SPEECH_KEY || '',
  azureRegion: process.env.AZURE_SPEECH_REGION || 'westeurope',
  azureVoice: process.env.AZURE_SPEECH_VOICE || 'he-IL-HilaNeural',
  googleKey: process.env.GOOGLE_TTS_API_KEY || '',
  googleVoice: process.env.GOOGLE_TTS_VOICE || 'he-IL-Wavenet-A',
  openaiKey: process.env.OPENAI_API_KEY || '',
  openaiVoice: process.env.OPENAI_TTS_VOICE || 'coral',
  elevenKey: process.env.ELEVENLABS_API_KEY || '',
  elevenVoice: process.env.ELEVENLABS_VOICE_ID || '',
  elevenModel: process.env.ELEVENLABS_MODEL || 'eleven_v3',
};

export type TtsProviderName = 'azure' | 'google' | 'openai' | 'elevenlabs';

export const hasSupabase = () => Boolean(env.supabaseUrl && env.supabaseServiceKey);
export const hasAdmin = () => Boolean(env.adminPassword && env.authSecret);

export function activeTtsProvider(): TtsProviderName | null {
  const p = env.ttsProvider;
  if (p === 'azure' && env.azureKey) return 'azure';
  if (p === 'google' && env.googleKey) return 'google';
  if (p === 'openai' && env.openaiKey) return 'openai';
  if (p === 'elevenlabs' && env.elevenKey && env.elevenVoice) return 'elevenlabs';
  return null;
}
