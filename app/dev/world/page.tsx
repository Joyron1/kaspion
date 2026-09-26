import { notFound } from 'next/navigation';
import WorldPreview from '@/components/world/WorldPreview';

// Development-only look at the 3D cast and the sea:  /dev/world?view=cast
export default async function WorldPreviewPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const q = await searchParams;
  return <WorldPreview view={q.view ?? 'cast'} />;
}
