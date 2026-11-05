"use client";

import { useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";

/**
 * Позиція випадного вікна (список, календар) під полем — або над ним, якщо внизу мало місця.
 * Вікно рендериться в <body> з position: fixed, бо «скляні» блоки (backdrop-filter) створюють
 * власні шари й перекривають усе, що випадає за їхні межі, незалежно від z-index.
 */
export function useAnchoredPopup(anchor: RefObject<HTMLElement | null>, open: boolean, wantedHeight: number, align: "left" | "right" = "left", width?: number) {
  const [style, setStyle] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = anchor.current?.getBoundingClientRect();
      if (!r) return;
      const gap = 6;
      const margin = 8;
      const below = window.innerHeight - r.bottom - gap - margin;
      const above = r.top - gap - margin;
      const up = below < wantedHeight && above > below;
      setStyle({
        position: "fixed",
        minWidth: r.width,
        maxHeight: Math.max(120, Math.min(wantedHeight, up ? above : below)),
        ...(align === "right" ? { right: Math.max(margin, window.innerWidth - r.right) } : { left: Math.max(margin, width ? Math.min(r.left, window.innerWidth - width - margin) : r.left) }),
        ...(up ? { bottom: window.innerHeight - r.top + gap } : { top: r.bottom + gap }),
      });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [anchor, open, wantedHeight, align, width]);

  return style;
}
