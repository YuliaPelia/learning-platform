"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";

/** Яку частку відео треба переглянути, щоб урок можна було позначити пройденим. */
export const WATCH_RATIO = 0.9;
/** Допуск для перемотування вперед (секунди) — щоб не «смикало» через неточність timeupdate. */
const SEEK_SLACK = 2;

type Gate = { watched: boolean; percent: number; setPercent: (p: number) => void; required: boolean };
const WatchContext = createContext<Gate>({ watched: true, percent: 100, setPercent: () => {}, required: false });

/**
 * Обгортка уроку: поки відео не переглянуто, кнопка «Урок пройдено» неактивна.
 * required=false (урок уже пройдено або відео з YouTube/Vimeo, яке не відстежити) — без обмежень.
 */
export function WatchGateProvider({ required, children }: { required: boolean; children: ReactNode }) {
  const [percent, setPercent] = useState(0);
  const watched = !required || percent >= WATCH_RATIO * 100;
  return <WatchContext.Provider value={{ watched, percent, setPercent, required }}>{children}</WatchContext.Provider>;
}

/** Відео уроку: рахує переглянуте й не дає перемотати вперед непереглянуту частину. */
export function GatedVideo(props: { src: string; poster?: string }) {
  const gate = useContext(WatchContext);
  const maxWatched = useRef(0);

  return (
    <video
      src={props.src}
      poster={props.poster}
      controls
      controlsList="nodownload noplaybackrate"
      disablePictureInPicture
      playsInline
      preload="metadata"
      className="h-full w-full"
      onTimeUpdate={(e) => {
        const v = e.currentTarget;
        // Рахуємо лише «чесний» перегляд: стрибок далі за переглянуте не зараховується
        if (v.currentTime <= maxWatched.current + SEEK_SLACK) maxWatched.current = Math.max(maxWatched.current, v.currentTime);
        if (v.duration) gate.setPercent(Math.min(100, Math.round((maxWatched.current / v.duration) * 100)));
      }}
      onSeeking={(e) => {
        const v = e.currentTarget;
        if (gate.required && v.currentTime > maxWatched.current + SEEK_SLACK) v.currentTime = maxWatched.current;
      }}
      onEnded={(e) => {
        const v = e.currentTarget;
        if (maxWatched.current >= v.duration * WATCH_RATIO - SEEK_SLACK) gate.setPercent(100);
      }}
    />
  );
}

/** Кнопка завершення уроку: активна лише після перегляду відео. */
export function CompleteLessonButton({ children }: { children: ReactNode }) {
  const { watched, percent } = useContext(WatchContext);
  return (
    <>
      <button className="btn-primary h-14 px-7 text-lg" disabled={!watched} aria-describedby={watched ? undefined : "watch-hint"}>
        {children}
      </button>
      {!watched && (
        <span id="watch-hint" className="text-sm text-muted" aria-live="polite">
          Подивись відео до кінця, щоб перейти далі · переглянуто {percent}%
        </span>
      )}
    </>
  );
}
