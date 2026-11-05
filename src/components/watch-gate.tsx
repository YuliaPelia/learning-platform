"use client";

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { VideoPlayer } from "@/components/video-player";

/** Яку частку відео треба переглянути, щоб урок можна було позначити пройденим. */
export const WATCH_RATIO = 0.9;
type Gate = { watched: boolean; percent: number; setPercent: Dispatch<SetStateAction<number>>; required: boolean };
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

/** Відео уроку у власному плеєрі: рахує переглянуте й не дає перемотати вперед непереглянуту частину. */
export function GatedVideo(props: { src: string; poster?: string; title?: string }) {
  const gate = useContext(WatchContext);
  return (
    <VideoPlayer
      {...props}
      limitSeek={gate.required}
      onWatched={(ratio) => gate.setPercent(Math.min(100, Math.round(ratio * 100)))}
      onEnded={() => gate.setPercent((p) => (p >= WATCH_RATIO * 100 - 5 ? 100 : p))}
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
