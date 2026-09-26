import { loadContent } from '@/lib/content/load';
import { STORY_PAGES } from '@/lib/content/story';
import ReadAlong from '@/components/read/ReadAlong';

export const dynamic = 'force-dynamic';

export default async function ReadPage() {
  const content = await loadContent();
  return <ReadAlong pages={STORY_PAGES.map(p => ({ id: p.id, scene: p.scene }))} content={content} />;
}
