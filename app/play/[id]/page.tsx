import { notFound } from 'next/navigation';
import { loadContent } from '@/lib/content/load';
import { LEVELS } from '@/lib/content/levels';
import GameScreen from '@/components/game/GameScreen';

export const dynamic = 'force-dynamic';

export default async function LevelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const index = LEVELS.findIndex(l => l.id === id);
  if (index < 0) notFound();
  const content = await loadContent();
  const next = LEVELS[index + 1]?.id ?? null;
  return <GameScreen key={id} levelId={id} index={index} total={LEVELS.length} nextId={next} content={content} />;
}
