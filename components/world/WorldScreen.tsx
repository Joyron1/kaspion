'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ContentBundle, Line, LineDef } from '@/lib/content/types';
import { STATIONS } from '@/lib/content/world';
import { STORY_PAGES } from '@/lib/content/story';
import { Narrator, estimateSeconds } from '@/game/engine/narrator';
import { note, sfx, setSfxMuted, startAmbience, stopAmbience, unlockAudio } from '@/game/engine/sfx';
import { markStationDone, readFood, resetWorld, writeFood, useMuted, useWorldProgress, writeMuted } from '@/lib/progress';
import { useWorldPrefs, type WorldPrefs } from '@/lib/worldPrefs';
import WorldSettings, { type ParentStatus } from './WorldSettings';
import type { World, WorldState } from '@/world/World';
import { AgainIcon, BookIcon, GearIcon, HomeIcon, NextIcon, PlayIcon, SoundIcon, StarIcon } from '../Icons';
import s from './world.module.css';

export default function WorldScreen({ content, defs, parent }: { content: ContentBundle; defs: LineDef[]; parent: ParentStatus }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World | null>(null);
  const narrator = useMemo(() => new Narrator(content.lines, { settings: content.narrator, cloud: content.cloudVoice }), [content]);
  const [state, setState] = useState<WorldState>({ phase: 'ready', station: 0, got: 0, goal: 0, page: null, food: 0, prompt: null });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const muted = useMuted();
  const done = useWorldProgress();
  const prefs = useWorldPrefs();
  const prefsRef = useRef<WorldPrefs>(prefs);
  const [lines, setLines] = useState(content.lines);
  const [settings, setSettings] = useState<null | 'play' | 'voice' | 'texts'>(null);
  const t = (key: string) => lines[key]?.text ?? '';

  useEffect(() => { narrator.setMuted(muted); setSfxMuted(muted); }, [narrator, muted]);
  useEffect(() => { prefsRef.current = prefs; }, [prefs]);
  // the narrator's voice on this device
  useEffect(() => {
    const v = prefs.voice;
    narrator.setDeviceVoice(v.startsWith('device:') ? v.slice(7) : null);
    narrator.setSettings({ ...content.narrator, rate: prefs.rate, preferCloud: v === 'auto' ? content.narrator.preferCloud : v === 'cloud' });
  }, [narrator, content, prefs.voice, prefs.rate]);

  const onLine = (l: Line) => { setLines(prev => ({ ...prev, [l.key]: l })); narrator.setLine(l); };

  useEffect(() => {
    let alive = true;
    let w: World | null = null;
    const q = new URLSearchParams(window.location.search);
    const bot = q.has('bot');
    const lite = q.has('lite');
    import('@/world/World').then(({ World }) => {
      if (!alive || !canvasRef.current) return;
      try {
        w = new World(canvasRef.current, {
          say: key => narrator.say(key),
          sfx: name => sfx[name](),
          onState: setState,
          onStationDone: i => markStationDone(i),
          estimate: key => estimateSeconds(narrator.line(key)?.speech ?? '', prefsRef.current.rate),
          counts: () => prefsRef.current.counts,
          note: f => note(f),
          food: () => readFood(),
          onFood: n => writeFood(n),
          bot,
          lite,
        });
        worldRef.current = w;
        setLoading(false);
        // back from the parent login: reopen the texts
        if (window.location.hash === '#texts') { setSettings('texts'); history.replaceState(null, '', window.location.pathname); }
      } catch {
        setFailed(true);
      }
    }).catch(() => setFailed(true));
    narrator.prefetch(Object.keys(content.lines).filter(k => k.startsWith('world.') || k.startsWith('story.')));
    return () => { alive = false; narrator.stop(); stopAmbience(); w?.dispose(); worldRef.current = null; };
  }, [narrator, content]);

  const firstOpen = STATIONS.findIndex((_, i) => !done.includes(i));
  const resumeAt = firstOpen < 0 ? 0 : firstOpen;

  const go = (i: number) => {
    unlockAudio(); narrator.unlock();
    startAmbience();
    worldRef.current?.begin(i);
  };
  const toggleSound = () => { const m = !muted; writeMuted(m); if (!m) unlockAudio(); };
  const station = STATIONS[state.station];
  const page = state.page ? STORY_PAGES.findIndex(p => p.id === state.page) : -1;

  if (failed) {
    return (
      <main className={s.root}>
        <section className={`sheet ${s.sheet}`}>
          <h1 className="display">אופס</h1>
          <p className={s.text}>המכשיר הזה לא מצליח להציג את העולם התלת־ממדי. אפשר לשחק במשחק הרגיל.</p>
          <div className={s.row}><Link className="big" href="/play">למשחק <PlayIcon /></Link><Link className="iconbtn" href="/" aria-label="לדף הבית"><HomeIcon /></Link></div>
        </section>
      </main>
    );
  }

  return (
    <main className={s.root}>
      <canvas ref={canvasRef} className={s.canvas} aria-label="העולם של כספיון" />

      {/* the journey track: a dot per station */}
      {state.phase !== 'ready' && (
        <div className={s.top}>
          <Link href="/" className="iconbtn" aria-label="לדף הבית" onClick={() => narrator.stop()}><HomeIcon /></Link>
          <div className={s.card}>
            <div className={`${s.title} display`}>
              {t(`world.${station.id}.title`)}
              {state.food > 0 && <span className={s.food} aria-label={`${state.food} חטיפים לדרך`}>🦐 {state.food}</span>}
            </div>
            <ol className={s.track} aria-label={`תחנה ${state.station + 1} מתוך ${STATIONS.length}`}>
              {STATIONS.map((st, i) => (
                <li key={st.id} className={`${s.stop} ${done.includes(i) ? s.stopDone : ''} ${i === state.station ? s.stopNow : ''}`} />
              ))}
            </ol>
            {state.phase === 'play' && state.prompt && <div className={s.prompt}>{t(state.prompt)}</div>}
            {state.phase === 'play' && state.goal > 0 && (
              <div className={s.prog} aria-label={`${state.got} מתוך ${state.goal}`}><i style={{ width: `${Math.round(Math.min(1, state.got / state.goal) * 100)}%` }} /></div>
            )}
          </div>
          <button className="iconbtn" onClick={toggleSound} aria-label={muted ? 'הפעלת צלילים' : 'השתקה'}><SoundIcon on={!muted} /></button>
          <button className="iconbtn" onClick={() => setSettings('play')} aria-label="הגדרות המסע"><GearIcon /></button>
        </div>
      )}

      {state.phase === 'travel' && page >= 0 && (
        <section className={s.caption} aria-live="polite">
          <span className={s.pageTag}>עמוד {page + 1}</span>
          <p className={s.text}>{t(`story.${state.page}`)}</p>
          <button className={s.skip} onClick={() => { narrator.stop(); worldRef.current?.skipTravel(); }} aria-label="דילוג לתחנה">
            <NextIcon />
          </button>
        </section>
      )}

      {state.phase === 'arrive' && (
        <div className={s.banner} role="status">
          <span className={s.bannerTag}>תחנה {state.station + 1}</span>
          <span className="display">{t(`world.${station.id}.intro`)}</span>
        </div>
      )}

      {state.phase === 'won' && (
        <section className={`sheet ${s.sheet} ${s.win}`}>
          <div className={s.stars} aria-hidden="true"><StarIcon /><StarIcon /><StarIcon /></div>
          <h2 className="display">{t('world.win')}</h2>
          <div className={s.row}>
            <button className="big" onClick={() => { narrator.stop(); worldRef.current?.next(); }} autoFocus>
              {state.station >= STATIONS.length - 1 ? 'לסוף המסע' : t('world.travel')} <PlayIcon />
            </button>
          </div>
        </section>
      )}

      {state.phase === 'end' && (
        <section className={`sheet ${s.sheet}`}>
          <div className={s.stars} aria-hidden="true"><StarIcon /><StarIcon /><StarIcon /></div>
          <h2 className="display">סוף המסע!</h2>
          <p className={s.text}>{t('world.end')}</p>
          <div className={s.row}>
            <button className="big" onClick={() => { resetWorld(); window.location.reload(); }}><AgainIcon /> מההתחלה</button>
            <Link className="big alt" href="/read"><BookIcon /> לקרוא את הסיפור</Link>
            <Link className="iconbtn" href="/" aria-label="לדף הבית"><HomeIcon /></Link>
          </div>
        </section>
      )}

      {state.phase === 'ready' && (
        <section className={`sheet ${s.sheet}`}>
          <span className="tag">הרפתקה בתלת־ממד</span>
          <h1 className="display">המסע של כספיון</h1>
          <p className={s.text}>{t('world.start')}</p>
          <div className={s.row}>
            <button className="big" onClick={() => go(resumeAt)} disabled={loading} autoFocus>
              {loading ? 'רגע...' : resumeAt > 0 ? `ממשיכים מתחנה ${resumeAt + 1}` : 'יוצאים למסע!'} <PlayIcon />
            </button>
            <button className="iconbtn" onClick={toggleSound} aria-label={muted ? 'הפעלת צלילים' : 'השתקה'}><SoundIcon on={!muted} /></button>
            <button className="iconbtn" onClick={() => setSettings('play')} aria-label="הגדרות המסע"><GearIcon /></button>
            <Link className="iconbtn" href="/" aria-label="לדף הבית"><HomeIcon /></Link>
          </div>
          <div className={s.pick} aria-label="בחירת תחנה">
            {STATIONS.map((st, i) => (
              <button key={st.id} className={`${s.pickBtn} ${done.includes(i) ? s.pickDone : ''}`} onClick={() => go(i)} disabled={loading} title={t(`world.${st.id}.title`)}>
                {i + 1}
              </button>
            ))}
          </div>
        </section>
      )}
      {settings && (
        <WorldSettings
          prefs={prefs}
          narrator={narrator}
          cloudVoice={content.cloudVoice}
          lines={lines}
          defs={defs}
          parent={parent}
          onLine={onLine}
          onClose={() => setSettings(null)}
          initialTab={settings}
        />
      )}
    </main>
  );
}
