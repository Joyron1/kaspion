'use client';

import Link from 'next/link';
import { useProgress } from '@/lib/progress';
import { BookIcon, HomeIcon, StarIcon } from '../Icons';
import s from './map.module.css';

interface Item { id: string; title: string; blurb: string }

/** The level map: a winding path through the sea, one stop per story moment. */
export default function LevelMap({ levels }: { levels: Item[] }) {
  const done = useProgress();
  const nextIdx = levels.findIndex(l => !done[l.id]);

  return (
    <main className={s.root}>
      <header className={s.head}>
        <Link href="/" className="iconbtn" aria-label="לדף הבית"><HomeIcon /></Link>
        <h1 className="display">המסע של כספיון</h1>
        <Link href="/read" className="iconbtn" aria-label="לסיפור"><BookIcon /></Link>
      </header>
      <ol className={s.path}>
        {levels.map((l, i) => {
          const isDone = Boolean(done[l.id]);
          const isNext = i === nextIdx;
          return (
            <li key={l.id} className={`${s.stop} ${i % 2 ? s.right : s.left}`}>
              <Link href={`/play/${l.id}`} className={`${s.node} ${isDone ? s.done : ''} ${isNext ? s.next : ''}`}>
                <span className={`${s.num} display`}>{i + 1}</span>
                <span className={s.text}>
                  <span className={`${s.title} display`}>{l.title}</span>
                  <span className={s.blurb}>{l.blurb}</span>
                </span>
                {isDone && <span className={s.star}><StarIcon size={30} /></span>}
              </Link>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
