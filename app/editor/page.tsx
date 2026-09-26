import type { Metadata } from 'next';
import { isAdmin } from '@/lib/auth';
import { activeTtsProvider, hasAdmin, hasSupabase } from '@/lib/env';
import { loadContent } from '@/lib/content/load';
import { allLineDefs } from '@/lib/content/registry';
import { LEVELS } from '@/lib/content/levels';
import { PROVIDER_LABEL } from '@/lib/tts/providers';
import Editor from '@/components/editor/Editor';
import Login from '@/components/editor/Login';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'כספיון · עריכה' };

export default async function EditorPage() {
  if (!(await isAdmin())) return <Login configured={hasAdmin()} />;
  const content = await loadContent();
  const tts = activeTtsProvider();
  return (
    <Editor
      defs={allLineDefs()}
      content={content}
      levels={LEVELS.map(l => ({ id: l.id, title: content.lines[`level.${l.id}.title`]?.text ?? l.title, knobs: l.knobs, config: l.config }))}
      status={{ supabase: hasSupabase(), tts: tts ? PROVIDER_LABEL[tts] : null, admin: true }}
    />
  );
}
