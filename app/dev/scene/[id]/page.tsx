import { notFound } from 'next/navigation';
import ScenePreview from '@/components/read/ScenePreview';

// Development-only preview of a read-along scene at a fixed moment:
//   /dev/scene/eye?t=3&p=0.5
export default async function ScenePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string; p?: string }>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { id } = await params;
  const q = await searchParams;
  return <ScenePreview id={id} t={Number(q.t ?? 2)} p={Number(q.p ?? 0.5)} />;
}
