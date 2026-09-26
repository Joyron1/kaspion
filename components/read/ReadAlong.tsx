'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ContentBundle, StoryPage } from '@/lib/content/types';
import { Narrator } from '@/game/engine/narrator';
import { Fx } from '@/game/engine/fx';
import { sea } from '@/game/engine/art';
import { SCENES } from '@/game/scenes';
import { STAGE_H, STAGE_W, type SceneInstance } from '@/game/scenes/types';
import { words } from '@/lib/nikud';
import { useMuted, writeMuted } from '@/lib/progress';
import { HomeIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon, SoundIcon } from '../Icons';
import s from './read.module.css';

interface Props { pages: Pick<StoryPage, 'id' | 'scene'>[]; content: ContentBundle }
type Mode = 'cover' | 'page' | 'end';

export default function ReadAlong({ pages, content }: Props) {
  const narrator = useMemo(() => new Narrator(content.lines, { settings: content.narrator, cloud: content.cloudVoice }), [content]);
  const [mode, setMode] = useState<Mode>('cover');
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [auto, setAutoState] = useState(true);
  const autoRef = useRef(true);
  const setAuto = (v: boolean) => { autoRef.current = v; setAutoState(v); };
  const [progress, setProgress] = useState(0);
  const muted = useMuted();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SceneInstance | null>(null);
  const fxRef = useRef(new Fx());
  const pageStart = useRef(0);
  const progressRef = useRef(0);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const run = useRef(0);

  const page = pages[index];
  const text = page ? content.lines[`story.${page.id}`]?.text ?? '' : '';
  const ws = useMemo(() => words(text), [text]);

  useEffect(() => { narrator.setMuted(muted); }, [narrator, muted]);

  // ---- canvas loop: draw the current page's scene
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const c = cv.getContext('2d')!;
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      const sc = Math.min(w / STAGE_W, h / STAGE_H);
      const ox = (w - STAGE_W * sc) / 2, oy = (h - STAGE_H * sc) / 2;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      sea(c, w, h, now / 1000, 0.1);
      c.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * ox, dpr * oy);
      c.save(); c.beginPath(); c.rect(-ox / sc, -oy / sc, w / sc, h / sc); c.clip();
      const t = (now - pageStart.current) / 1000;
      sceneRef.current?.draw(c, t, progressRef.current);
      fxRef.current.update(dt);
      fxRef.current.draw(c);
      c.restore();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ---- switch scene when the page changes
  useEffect(() => {
    const id = mode === 'cover' ? 'cover' : mode === 'end' ? 'end' : page?.scene;
    const def = (id && SCENES[id]) || SCENES.cover;
    fxRef.current.clear();
    sceneRef.current = def ? def.create({ fx: fxRef.current }) : null;
    pageStart.current = performance.now();
    progressRef.current = 0;
  }, [mode, index, page?.scene]);

  const clearAdvance = () => { if (advanceTimer.current) { clearTimeout(advanceTimer.current); advanceTimer.current = null; } };

  const readPageRef = useRef<(i: number) => void>(() => {});
  const readPage = useCallback(async (i: number) => {
    clearAdvance();
    const my = ++run.current;
    setPlaying(true);
    progressRef.current = 0; setProgress(0);
    await narrator.say(`story.${pages[i].id}`, {
      onProgress: f => { if (my === run.current) { progressRef.current = f; setProgress(f); } },
    });
    if (my !== run.current) return;
    progressRef.current = 1; setProgress(1);
    setPlaying(false);
    if (autoRef.current) {
      advanceTimer.current = setTimeout(() => {
        if (my !== run.current) return;
        if (i < pages.length - 1) { setIndex(i + 1); readPageRef.current(i + 1); }
        else { setMode('end'); void narrator.say('ui.read.end'); }
      }, 1300);
    }
  }, [narrator, pages]);
  useEffect(() => { readPageRef.current = i => void readPage(i); }, [readPage]);

  const stopReading = () => { run.current++; clearAdvance(); narrator.stop(); setPlaying(false); };

  const begin = (withVoice: boolean) => {
    narrator.unlock();
    setAuto(withVoice);
    setMode('page'); setIndex(0); setProgress(0);
    if (withVoice) setTimeout(() => void readPage(0), 50);
  };
  const go = (i: number) => {
    stopReading();
    if (i < 0) return;
    if (i >= pages.length) { setMode('end'); return; }
    setMode('page'); setIndex(i); setProgress(0);
    if (autoRef.current) setTimeout(() => void readPage(i), 50);
  };
  const toggle = () => {
    if (playing) stopReading();
    else { narrator.unlock(); void readPage(index); }
  };
  const toggleSound = () => {
    writeMuted(!muted);
  };

  useEffect(() => () => { run.current++; clearAdvance(); narrator.stop(); }, [narrator]);

  // highlight: the word whose character span covers the narration progress
  const totalChars = ws.length ? ws[ws.length - 1].end : 1;
  const current = playing || progress > 0 ? ws.findIndex(w => w.end >= progress * totalChars) : -1;

  return (
    <div className={s.root}>
      <div className={s.stage}>
        <canvas ref={canvasRef} className={s.canvas} aria-hidden="true" />
        <Link href="/" className={`iconbtn ${s.home}`} aria-label="לדף הבית" onClick={() => stopReading()}><HomeIcon /></Link>
        <button className={`iconbtn ${s.sound}`} onClick={toggleSound} aria-label={muted ? 'הפעלת קול' : 'השתקה'}><SoundIcon on={!muted} /></button>
      </div>

      {mode === 'cover' && (
        <section className={`sheet ${s.panel}`}>
          <span className="tag">הסיפור</span>
          <h1 className="display">כספיון הדג הקטן</h1>
          <p className={s.sub}>הסיפור שלנו, במילים שלנו, בהשראת הספר של פאול קור.</p>
          <div className={s.row}>
            <button className="big" onClick={() => begin(true)} autoFocus><PlayIcon /> הקריין מקריא</button>
            <button className="big alt" onClick={() => begin(false)}>קוראים לבד</button>
          </div>
        </section>
      )}

      {mode === 'page' && page && (
        <section className={`sheet ${s.panel}`}>
          <p className={s.text} dir="rtl">
            {ws.length === 0 ? text : ws.map((w, i) => (
              <span key={i} className={i === current ? s.now : i < current ? s.read : undefined}>{w.word}{' '}</span>
            ))}
          </p>
          <div className={s.controls}>
            <button className="iconbtn" onClick={() => go(index - 1)} disabled={index === 0} aria-label="העמוד הקודם"><PrevIcon /></button>
            <button className="big" onClick={toggle} aria-label={playing ? 'עצירה' : 'הקראה'}>{playing ? <PauseIcon /> : <PlayIcon />}</button>
            <button className="iconbtn" onClick={() => go(index + 1)} aria-label="העמוד הבא"><NextIcon /></button>
            <span className={s.pageNo}>עמוד {index + 1} מתוך {pages.length}</span>
            <label className={s.auto}>
              <input id="auto-turn" type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} />
              הפיכת עמוד אוטומטית
            </label>
          </div>
        </section>
      )}

      {mode === 'end' && (
        <section className={`sheet ${s.panel}`}>
          <h2 className="display">{content.lines['ui.read.end']?.text ?? 'סוף.'}</h2>
          <div className={s.row}>
            <button className="big" onClick={() => begin(true)}><PlayIcon /> שוב מההתחלה</button>
            <Link className="big alt" href="/play">לשחק במשחק</Link>
          </div>
        </section>
      )}
    </div>
  );
}
