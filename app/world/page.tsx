import type { Metadata } from 'next';
import { loadContent } from '@/lib/content/load';
import WorldScreen from '@/components/world/WorldScreen';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'המסע של כספיון' };

export default async function WorldPage() {
  const content = await loadContent();
  return <WorldScreen content={content} />;
}
