"use client";

import { useEffect, useRef } from "react";

const HOVER_SELECTOR = 'a, button, [role="button"], summary, label, select, [data-cursor="hover"]';
const TEXT_SELECTOR = 'input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]), textarea, [contenteditable="true"]';

/**
 * Анімований «скляний» курсор у стилі мильної бульбашки: стрілка, що над інтерактивними елементами
 * перетворюється на руку, і хвіст із м'яких бульбашок. Стискається при натисканні, а на клік дає «хвилю».
 * Вмикається лише для миші (hover + fine pointer) і без prefers-reduced-motion; на сенсорних екранах
 * і в текстових полях лишається системний курсор. Системний курсор ховається після першого руху миші.
 */
const TRAIL = [14, 11, 8, 6]; // розміри бульбашок хвоста, px

export function CustomCursor() {
  const mainRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const main = mainRef.current;
    const trail = trailRef.current;
    if (!main || !trail) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduced.matches) return;

    const bubbles = Array.from(trail.children) as HTMLElement[];
    const root = document.documentElement;
    const target = { x: -100, y: -100 };
    const points = bubbles.map(() => ({ x: -100, y: -100 }));
    let raf = 0;
    let active = false;

    const setState = (state: "idle" | "hover" | "down" | "text" | "hidden") => {
      main.dataset.state = state;
      trail.dataset.state = state;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      target.x = e.clientX;
      target.y = e.clientY;
      if (!active) {
        active = true;
        points.forEach((pt) => Object.assign(pt, target));
        root.classList.add("has-custom-cursor");
        setState("idle");
        raf = requestAnimationFrame(tick);
      }
    };

    const tick = () => {
      main.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;
      // кожна бульбашка наздоганяє попередню — виходить плавний «хвіст»
      let prev = target;
      points.forEach((pt, i) => {
        pt.x += (prev.x - pt.x) * (0.34 - i * 0.05);
        pt.y += (prev.y - pt.y) * (0.34 - i * 0.05);
        bubbles[i].style.transform = `translate3d(${pt.x}px, ${pt.y}px, 0)`;
        prev = pt;
      });
      raf = requestAnimationFrame(tick);
    };

    const stateFor = (el: Element) => (el.closest(TEXT_SELECTOR) ? "text" : el.closest(HOVER_SELECTOR) ? "hover" : "idle");

    const onOver = (e: PointerEvent) => {
      if (active && e.target instanceof Element) setState(stateFor(e.target));
    };

    const onDown = (e: PointerEvent) => {
      if (!active || e.pointerType !== "mouse") return;
      setState("down");
      const wave = document.createElement("div");
      wave.className = "cursor-wave";
      wave.style.left = `${e.clientX}px`;
      wave.style.top = `${e.clientY}px`;
      wave.addEventListener("animationend", () => wave.remove(), { once: true });
      document.body.appendChild(wave);
    };
    const onUp = (e: PointerEvent) => {
      if (active && e.target instanceof Element) setState(stateFor(e.target));
    };
    const onLeave = () => active && setState("hidden");
    const onEnter = () => active && setState("idle");

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.documentElement.addEventListener("pointerenter", onEnter);

    return () => {
      cancelAnimationFrame(raf);
      root.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.documentElement.removeEventListener("pointerenter", onEnter);
    };
  }, []);

  return (
    <>
      <div ref={trailRef} className="cursor-trail" data-state="hidden" aria-hidden>
        {TRAIL.map((size) => (
          <i key={size} style={{ width: size, height: size, margin: `${-size / 2}px 0 0 ${-size / 2}px` }} />
        ))}
      </div>
      <div ref={mainRef} className="cursor-main" data-state="hidden" aria-hidden>
        <svg className="cursor-arrow" width="44" height="44" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="cur-stroke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#3fe6c4" />
              <stop offset="0.5" stopColor="#8f8bea" />
              <stop offset="1" stopColor="#c05ce0" />
            </linearGradient>
            <radialGradient id="cur-fill" cx="0.5" cy="0.58" r="0.7">
              <stop offset="0" stopColor="#f9d6fb" />
              <stop offset="0.55" stopColor="#dccbfb" />
              <stop offset="1" stopColor="#c9f1f6" />
            </radialGradient>
          </defs>
          <path
            d="M7 5.5 Q7 4 8.4 4.6 L38.5 17.6 Q40.5 18.6 38.6 19.8 L28.5 25.2 L37.2 37.6 Q38.4 39.4 36.6 40.6 L32.6 43.4 Q31 44.4 29.8 42.8 L21.2 30.2 L12.6 37.4 Q10.6 39 9.4 36.8 Z"
            fill="url(#cur-fill)"
            stroke="url(#cur-stroke)"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path d="M11 11.5 L10.2 31.5 L16 26.4 L24.6 38.2" fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18 12.2 L27 16 M16.4 15.8 L22 18.2" stroke="#fff" strokeOpacity="0.8" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        <svg className="cursor-hand" width="46" height="46" viewBox="0 0 48 48">
          <path
            d="M15.5 4.6 Q21 4.2 21 10.4 L21 21 Q22.6 19.6 25 20 Q26.8 18.6 29.4 19.4 Q31.4 18.4 33.6 19.8 Q37.6 20 38.6 24.8 L38.6 31.2 Q38.4 39.6 31 43.4 L22.4 43.6 Q18 43.4 15.6 39.8 L9.2 31 Q7.4 28.2 9.8 26.6 Q12.6 25.4 14.4 28.2 L15 29.4 L15 10.4 Q14.6 5.2 15.5 4.6 Z"
            fill="url(#cur-fill)"
            stroke="url(#cur-stroke)"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path d="M18.2 8.4 L18.2 24 M12 28.6 L17.4 36.4" fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M28 25.6 L33.8 27.4 M27.6 29 L31.4 30.2" stroke="#fff" strokeOpacity="0.8" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>
    </>
  );
}
