'use client';

import { useEffect, useRef } from 'react';

export default function WorldPreview({ view }: { view: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let stop = () => {};
    void import('@/world/preview').then(m => { if (ref.current) stop = m.preview(ref.current, view); });
    return () => stop();
  }, [view]);
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', display: 'block' }} />;
}
