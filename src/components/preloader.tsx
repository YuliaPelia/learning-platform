"use client";

import { useEffect, useRef, useState } from "react";

const MIN_VISIBLE_MS = 700; // щоб прелоадер не «блимав» на швидкому з'єднанні
const MAX_VISIBLE_MS = 4000; // страховка, якщо подія load не прийшла
const FADE_MS = 500;

/**
 * Екран завантаження. Рендериться на сервері (видно з першого кадру), ховається після window.load.
 * Без JS його прибирає CSS-анімація preloader-failsafe; при prefers-reduced-motion зникає без анімацій.
 */
export function Preloader() {
  const ref = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const start = performance.now();
    const timers: number[] = [];
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - start));
      timers.push(
        window.setTimeout(() => {
          el.classList.add("is-done");
          timers.push(window.setTimeout(() => setGone(true), FADE_MS));
        }, wait),
      );
    };

    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });
    timers.push(window.setTimeout(finish, MAX_VISIBLE_MS));

    return () => {
      window.removeEventListener("load", finish);
      timers.forEach(window.clearTimeout);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      className="preloader-failsafe bg-brand-flow fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 text-white transition-opacity duration-500 [&.is-done]:pointer-events-none [&.is-done]:opacity-0"
    >
      <div className="anim-pulse-soft flex h-20 w-20 items-center justify-center rounded-3xl bg-white font-display text-3xl font-bold text-accent shadow-2xl shadow-[#2d1a8c]/40">
        {"</>"}
      </div>
      <div className="font-display text-2xl font-bold tracking-tight">ITCodeCraft</div>
      <div className="h-1.5 w-44 overflow-hidden rounded-full bg-white/25" aria-hidden>
        <div className="anim-load-bar h-full w-1/3 rounded-full bg-white" />
      </div>
      <span className="sr-only">Завантаження…</span>
    </div>
  );
}
