"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * Поява блоку при прокрутці. Без JS і для prefers-reduced-motion контент видно одразу;
 * блоки, що вже у вікні при завантаженні, не ховаємо (щоб не було мигання).
 * Стан тримаємо в data-reveal (без React state), стилі — у globals.css.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  style,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    el.dataset.reveal = "hidden";
    let cleanup: number | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.reveal = "shown";
        io.disconnect();
        // після анімації прибираємо атрибут, щоб не заважати hover-переходам
        cleanup = window.setTimeout(() => delete el.dataset.reveal, 900 + delay);
      },
      { threshold: 0.12, rootMargin: "0px 0px -5% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(cleanup);
    };
  }, [delay]);

  return (
    <div ref={ref} className={className} style={{ transitionDelay: `${delay}ms`, ...style }}>
      {children}
    </div>
  );
}
