"use client";

import Image from "next/image";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { IconArrow, IconCheck } from "@/components/icons";
import { MascotAvatar } from "@/components/mascot";
import { GUIDE, type GuideAudience } from "@/lib/guide";

/**
 * Слайдер-інструкція «Як користуватися платформою»: вкладки «Для батьків» / «Для дітей»,
 * скрін кабінету + детальний опис кроку. images — шляхи до наявних скрінів (id → /guide/…),
 * для решти слайдів показується заглушка з підписом, що має бути на скріні.
 * Керування: стрілки, крапки, свайп, клавіші ←/→.
 */
export function PlatformGuide({ images }: { images: Record<string, string> }) {
  const [audience, setAudience] = useState<GuideAudience>("parents");
  const [index, setIndex] = useState(0);
  const swipe = useRef<number | null>(null);
  const { slides, intro } = GUIDE[audience];
  const slide = slides[index];
  const src = images[slide.id];

  const go = (i: number) => setIndex((i + slides.length) % slides.length);

  function switchTo(a: GuideAudience) {
    setAudience(a);
    setIndex(0);
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(index + 1);
    }
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (swipe.current === null) return;
    const dx = e.clientX - swipe.current;
    swipe.current = null;
    if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Вкладки */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div role="tablist" aria-label="Для кого інструкція" className="flex self-start rounded-full bg-surface-2 p-1">
          {(Object.keys(GUIDE) as GuideAudience[]).map((a) => (
            <button
              key={a}
              type="button"
              role="tab"
              id={`guide-tab-${a}`}
              aria-selected={audience === a}
              aria-controls="guide-panel"
              onClick={() => switchTo(a)}
              className={`h-11 rounded-full px-5 text-sm font-semibold transition sm:px-6 ${audience === a ? "bg-text text-white shadow-pill" : "text-soft hover:text-text"}`}
            >
              {GUIDE[a].label}
            </button>
          ))}
        </div>
        <p className="max-w-[520px] text-muted">{intro}</p>
      </div>

      {/* Слайд */}
      <div
        id="guide-panel"
        role="tabpanel"
        aria-labelledby={`guide-tab-${audience}`}
        aria-roledescription="слайдер"
        tabIndex={0}
        onKeyDown={onKey}
        onPointerDown={(e) => (swipe.current = e.clientX)}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipe.current = null)}
        className="card grid gap-6 overflow-hidden p-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent sm:p-6 lg:grid-cols-[1.35fr_1fr] lg:gap-10 lg:p-8"
      >
        {/* Скрін у «вікні браузера» */}
        <div className="flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-line bg-surface-2 shadow-soft">
          <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-line bg-white/70 px-4" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-3 truncate rounded-full bg-surface-2 px-3 py-0.5 font-mono text-[11px] text-muted">
              itcodecraft · {audience === "parents" ? "кабінет батьків" : "кабінет учня"}
            </span>
          </div>
          <div className="relative aspect-[16/10] w-full">
            {src ? (
              <Image key={src} src={src} alt={slide.screen} fill sizes="(min-width: 1024px) 680px, 100vw" className="anim-fade object-cover object-top" />
            ) : (
              <div key={slide.id} className="anim-fade absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[radial-gradient(30rem_18rem_at_70%_20%,rgb(193_85_232/0.14),transparent_60%),radial-gradient(26rem_18rem_at_20%_90%,rgb(109_74_255/0.14),transparent_60%)] p-6 text-center">
                <MascotAvatar size={64} />
                <p className="max-w-[340px] text-sm leading-relaxed text-muted">{slide.screen}</p>
              </div>
            )}
          </div>
        </div>

        {/* Опис */}
        <div key={`${audience}-${index}`} className="anim-fade flex min-w-0 flex-col gap-5" aria-live="polite">
          <span className="font-mono text-sm font-semibold text-muted">
            Крок {index + 1} з {slides.length}
          </span>
          <h3 className="font-display text-2xl leading-tight font-extrabold sm:text-[28px]">{slide.title}</h3>
          <p className="leading-relaxed text-soft">{slide.text}</p>
          <ul className="flex flex-col gap-2.5">
            {slide.points.map((p) => (
              <li key={p} className="flex gap-3 text-[15px] leading-snug">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-good/12 text-good">
                  <IconCheck size={12} />
                </span>
                {p}
              </li>
            ))}
          </ul>

          {/* Навігація */}
          <div className="mt-auto flex items-center justify-between gap-4 pt-2">
            <div className="flex gap-1.5">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Крок ${i + 1}: ${s.title}`}
                  aria-current={i === index ? "step" : undefined}
                  className={`h-2.5 rounded-full transition-all ${i === index ? "w-7 bg-text" : "w-2.5 bg-line-2 hover:bg-muted"}`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => go(index - 1)} className="icon-btn h-11 w-11" aria-label="Попередній крок">
                <IconArrow size={16} className="rotate-180" />
              </button>
              <button type="button" onClick={() => go(index + 1)} className="icon-btn h-11 w-11 bg-text text-white hover:text-white" aria-label="Наступний крок">
                <IconArrow size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
