import Link from 'next/link';
import { loadContent } from '@/lib/content/load';
import SceneCanvas from '@/components/SceneCanvas';
import { BookIcon, PenIcon, PlayIcon } from '@/components/Icons';
import s from './home.module.css';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { lines } = await loadContent();
  const t = (k: string) => lines[k]?.text ?? '';
  return (
    <main className={s.root}>
      <SceneCanvas scene="cover" className={s.bg} />
      <div className={s.center}>
        <h1 className={`${s.logo} display`}>{t('ui.app.title')}</h1>
        <p className={s.tagline}>{t('ui.app.tagline')}</p>
        <div className={s.choices}>
          <Link href="/world" className="big"><PlayIcon /> {t('ui.home.world')}</Link>
          <Link href="/play" className="big alt"><PlayIcon /> {t('ui.home.play')}</Link>
          <Link href="/read" className="big alt"><BookIcon /> {t('ui.home.read')}</Link>
        </div>
      </div>
      <footer className={s.foot}>
        <span>בהשראת &quot;כספיון הדג הקטן&quot; מאת פאול קור. הטקסטים והציורים כאן הם שלנו.</span>
        <Link href="/editor" className={s.parent}><PenIcon /> להורים</Link>
      </footer>
    </main>
  );
}
