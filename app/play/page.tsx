import { loadContent } from '@/lib/content/load';
import { LEVELS } from '@/lib/content/levels';
import LevelMap from '@/components/game/LevelMap';

export const dynamic = 'force-dynamic';

export default async function PlayPage() {
  const { lines } = await loadContent();
  const items = LEVELS.map(l => ({ id: l.id, title: lines[`level.${l.id}.title`]?.text ?? l.title, blurb: l.blurb }));
  return <LevelMap levels={items} />;
}
