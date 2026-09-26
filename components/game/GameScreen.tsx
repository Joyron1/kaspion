'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ContentBundle } from '@/lib/content/types';
import { Game } from '@/game/engine/game';
import { Narrator } from '@/game/engine/narrator';
import { setSfxMuted, unlockAudio } from '@/game/engine/sfx';
import type { HudState, PlayResult } from '@/game/engine/types';
import { LEVEL_DEFS } from '@/game/levels';
import { markLevelDone, useMuted, writeMuted } from '@/lib/progress';
import { AgainIcon, HandIcon, HomeIcon, ItemIcon, MapIcon, PlayIcon, SoundIcon, StarIcon } from '../Icons';
import s from './game.module.css';

interface Props {
  levelId: string;
  index: number;
  total: number;
  nextId: string | null;
  content: ContentBundle;
}

type Phase = 'intro' | 'play' | 'done';

export default function GameScreen({ levelId, index, total, nextId, content }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const narrator = useMemo(() => new Narrator(content.lines, { settings: content.narrator, cloud: content.cloudVoice }), [content]);
  const [phase, setPhase] = useState<Phase>('intro');
  const [hud, setHud] = useState<HudState | null>(null);
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);
  const [banner, setBanner] = useState<{ text: string; stage: number; id: number } | null>(null);
  const [result, setResult] = useState<PlayResult | null>(null);
  const muted = useMuted();
  const [portrait, setPortrait] = useState(false);
  const bot = useRef(false);

  const t = (key: string) => content.lines[key]?.text ?? '';
  const lk = (name: string) => `level.${levelId}.${name}`;

  useEffect(() => { narrator.setMuted(muted); setSfxMuted(muted); }, [narrator, muted]);

  useEffect(() => {
    const check = () => setPortrait(window.innerHeight > window.innerWidth * 1.15 && window.innerWidth < 700);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const def = LEVEL_DEFS[levelId];
    if (!canvasRef.current || !def) return;
    bot.current = new URLSearchParams(window.location.search).has('bot');
    const g = new Game(canvasRef.current, def, {
      levelId,
      narrator,
      cfg: content.levelConfig[levelId] ?? {},
      bot: bot.current,
      onHud: setHud,
      onToast: text => setToast({ text, id: Math.random() }),
      onStage: (stage, text) => setBanner({ text, stage, id: Math.random() }),
      onComplete: r => {
        setResult(r);
        setPhase('done');
        markLevelDone(levelId, r.seconds);
        void narrator.say(lk('win'));
        if (!bot.current) {
          void fetch('/api/plays', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ level_id: levelId, seconds: r.seconds, stages: r.stages }),
          }).catch(() => {});
        }
      },
    });
    gameRef.current = g;
    // warm up the cloud voice for this level's lines
    narrator.prefetch(Object.keys(content.lines).filter(k => k.startsWith(`level.${levelId}.`)));
    void narrator.say(lk('intro'));
    return () => { g.dispose(); gameRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId, narrator]);

  // banners and toasts fade by themselves
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    if (!banner) return;
    const id = setTimeout(() => setBanner(null), 4200);
    return () => clearTimeout(id);
  }, [banner]);

  const start = () => {
    unlockAudio(); narrator.unlock();
    setPhase('play');
    gameRef.current?.start();
  };
  const toggleSound = () => {
    const m = !muted;
    writeMuted(m);
    if (!m) unlockAudio();
  };
  const again = () => { narrator.stop(); window.location.reload(); };

  if (!LEVEL_DEFS[levelId]) return <p className={s.missing}>השלב הזה עוד לא מוכן.</p>;

  return (
    <div className={s.root}>
      <canvas ref={canvasRef} className={s.canvas} aria-label={`שלב ${index + 1}: ${t(lk('title'))}`} />

      {phase === 'play' && hud && (
        <div className={s.hud}>
          <Link href="/play" className="iconbtn" aria-label="למפת השלבים" onClick={() => narrator.stop()}><MapIcon /></Link>
          <div className={s.hudcard}>
            <div className={`${s.hudname} display`}>{t(lk('title'))}</div>
            <div className={s.stageDots} aria-label={`משימה ${hud.stage + 1} מתוך ${hud.stages}`}>
              {Array.from({ length: hud.stages }, (_, i) => (
                <span key={i} className={`${s.dot} ${i < hud.stage ? s.dotDone : ''} ${i === hud.stage ? s.dotNow : ''}`} />
              ))}
            </div>
            {hud.icon && hud.goal > 0 && (
              <div className={s.items}>
                {hud.goal <= 12
                  ? Array.from({ length: hud.goal }, (_, i) => (
                    <span key={i} className={`${s.item} ${i < hud.got ? s.itemOn : ''}`}><ItemIcon name={hud.icon!} /></span>
                  ))
                  : <span className={s.count}><span className={s.item + ' ' + s.itemOn}><ItemIcon name={hud.icon} /></span><span dir="ltr">{hud.got} / {hud.goal}</span></span>}
              </div>
            )}
            {hud.progress !== null && (
              <div className={s.prog}><i style={{ width: `${Math.round(hud.progress * 100)}%` }} /></div>
            )}
          </div>
          <button className="iconbtn" onClick={toggleSound} aria-label={muted ? 'הפעלת צלילים' : 'השתקה'}><SoundIcon on={!muted} /></button>
        </div>
      )}

      {phase === 'play' && banner && (
        <div key={banner.id} className={s.banner} role="status">
          <span className={s.bannerTag}>משימה {banner.stage + 1}</span>
          <span className="display">{banner.text}</span>
        </div>
      )}
      {phase === 'play' && toast && !banner && <div key={toast.id} className={`${s.toast} display`} role="status">{toast.text}</div>}

      {phase === 'intro' && (
        <section className={`sheet ${s.sheet}`}>
          <span className="tag">שלב {index + 1} מתוך {total}</span>
          <h1 className="display">{t(lk('title'))}</h1>
          <p className={s.story}>{t(lk('intro'))}</p>
          <div className={s.hint}><HandIcon /><span>{t(lk('hint')) || t('ui.touch.hint')}</span></div>
          <div className={s.row}>
            <button className="big" onClick={start} autoFocus>יאללה! <PlayIcon /></button>
            <button className="iconbtn" onClick={() => { narrator.unlock(); void narrator.say(lk('intro')); }} aria-label="הקראה"><SoundIcon on /></button>
            <Link className="iconbtn" href="/play" aria-label="למפת השלבים"><MapIcon /></Link>
          </div>
        </section>
      )}

      {phase === 'done' && (
        <section className={`sheet ${s.sheet}`}>
          <div className={s.stars} aria-hidden="true"><StarIcon /><StarIcon /><StarIcon /></div>
          <h2 className="display">{t('ui.level.done').split('!')[0]}!</h2>
          <p className={s.story}>{t(lk('win'))}</p>
          {result && <p className={s.time}>זמן משחק: {Math.floor(result.seconds / 60)}:{String(result.seconds % 60).padStart(2, '0')} דקות</p>}
          <div className={s.row}>
            {nextId
              ? <Link className="big" href={`/play/${nextId}`} onClick={() => narrator.stop()}>{t('ui.level.next')} <PlayIcon /></Link>
              : <Link className="big" href="/read" onClick={() => narrator.stop()}>לקרוא את כל הסיפור <PlayIcon /></Link>}
            <button className="big alt" onClick={again}><AgainIcon /> {t('ui.level.again')}</button>
            <Link className="iconbtn" href="/" aria-label="לדף הבית"><HomeIcon /></Link>
          </div>
        </section>
      )}

      {portrait && phase !== 'done' && (
        <div className={s.rotate} aria-hidden="true">כדאי לסובב את המסך לרוחב</div>
      )}
    </div>
  );
}
