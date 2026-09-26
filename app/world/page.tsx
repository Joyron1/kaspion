import type { Metadata } from 'next';
import { loadContent } from '@/lib/content/load';
import { allLineDefs } from '@/lib/content/registry';
import { isAdmin } from '@/lib/auth';
import { activeTtsProvider, hasAdmin, hasSupabase } from '@/lib/env';
import { PROVIDER_LABEL } from '@/lib/tts/providers';
import WorldScreen from '@/components/world/WorldScreen';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'המסע של כספיון' };

export default async function WorldPage() {
  const [content, admin] = await Promise.all([loadContent(), isAdmin()]);
  const tts = activeTtsProvider();
  // the texts a parent can vowel and record from the journey settings: the story and the journey's own lines
  const defs = allLineDefs().filter(d => d.group === 'story' || d.group === 'world');
  return (
    <WorldScreen
      content={content}
      defs={defs}
      parent={{ admin, configured: hasAdmin(), supabase: hasSupabase(), tts: tts ? PROVIDER_LABEL[tts] : null }}
    />
  );
}
