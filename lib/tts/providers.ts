import 'server-only';
import { env, activeTtsProvider, type TtsProviderName } from '../env';

export interface Synth { bytes: ArrayBuffer; contentType: string; voiceId: string }

const escapeXml = (s: string) => s.replace(/[<>&'"]/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[ch]!));

async function azure(text: string, rate: number): Promise<Synth> {
  const pct = Math.round((rate - 1) * 100);
  const ssml = `<speak version="1.0" xml:lang="he-IL"><voice name="${env.azureVoice}"><prosody rate="${pct >= 0 ? '+' : ''}${pct}%">${escapeXml(text)}</prosody></voice></speak>`;
  const res = await fetch(`https://${env.azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': env.azureKey,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
      'User-Agent': 'kaspion',
    },
    body: ssml,
  });
  if (!res.ok) throw new Error(`Azure TTS ${res.status}: ${await res.text().catch(() => '')}`);
  return { bytes: await res.arrayBuffer(), contentType: 'audio/mpeg', voiceId: `azure:${env.azureVoice}:${rate}` };
}

async function google(text: string, rate: number): Promise<Synth> {
  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(env.googleKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: 'he-IL', name: env.googleVoice },
      audioConfig: { audioEncoding: 'MP3', speakingRate: rate },
    }),
  });
  if (!res.ok) throw new Error(`Google TTS ${res.status}: ${await res.text().catch(() => '')}`);
  const json = (await res.json()) as { audioContent: string };
  const buf = Buffer.from(json.audioContent, 'base64');
  return { bytes: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), contentType: 'audio/mpeg', voiceId: `google:${env.googleVoice}:${rate}` };
}

async function openai(text: string, rate: number): Promise<Synth> {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: env.openaiVoice,
      input: text,
      instructions: 'Read in natural Israeli Hebrew, warmly and slowly, like a parent reading a picture book to a young child. Follow the nikud (vowel points) exactly.',
      speed: rate,
      response_format: 'mp3',
    }),
  });
  if (!res.ok) throw new Error(`OpenAI TTS ${res.status}: ${await res.text().catch(() => '')}`);
  return { bytes: await res.arrayBuffer(), contentType: 'audio/mpeg', voiceId: `openai:${env.openaiVoice}:${rate}` };
}

async function elevenlabs(text: string, rate: number): Promise<Synth> {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(env.elevenVoice)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': env.elevenKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: env.elevenModel, language_code: 'he', voice_settings: { speed: Math.min(1.2, Math.max(0.7, rate)) } }),
  });
  if (!res.ok) throw new Error(`ElevenLabs TTS ${res.status}: ${await res.text().catch(() => '')}`);
  return { bytes: await res.arrayBuffer(), contentType: 'audio/mpeg', voiceId: `elevenlabs:${env.elevenVoice}:${env.elevenModel}:${rate}` };
}

const PROVIDERS: Record<TtsProviderName, (text: string, rate: number) => Promise<Synth>> = { azure, google, openai, elevenlabs };

/** Identifies the voice so cached audio is reused only for the same voice and speed. */
export function voiceKey(rate = 1): string {
  const p = activeTtsProvider();
  switch (p) {
    case 'azure': return `azure:${env.azureVoice}:${rate}`;
    case 'google': return `google:${env.googleVoice}:${rate}`;
    case 'openai': return `openai:${env.openaiVoice}:${rate}`;
    case 'elevenlabs': return `elevenlabs:${env.elevenVoice}:${env.elevenModel}:${rate}`;
    default: return 'none';
  }
}

export async function synthesize(text: string, rate = 1): Promise<Synth> {
  const p = activeTtsProvider();
  if (!p) throw new Error('no TTS provider configured');
  return PROVIDERS[p](text, rate);
}

export const PROVIDER_LABEL: Record<TtsProviderName, string> = {
  azure: 'Microsoft Azure',
  google: 'Google Cloud',
  openai: 'OpenAI',
  elevenlabs: 'ElevenLabs',
};
