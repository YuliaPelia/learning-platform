"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { IconClock } from "@/components/icons";
import { useAnchoredPopup } from "@/components/use-anchored-popup";

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, h) => h);

function parse(v: string | undefined): [number, number] | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(v ?? "");
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/**
 * Власний вибір часу замість системного <input type="time">.
 * Дві колонки — години й хвилини (крок `step`), плюс швидкі варіанти. Значення «17:30»
 * йде у форму через приховане поле `name`.
 * Клавіатура: ↑/↓ — значення в колонці, ←/→ — між колонками, Enter — готово, Esc — закрити.
 */
export function TimePicker({
  name,
  defaultValue = "17:00",
  step = 5,
  quick = ["15:00", "16:00", "17:00", "18:00", "19:00"],
  className = "",
}: {
  name: string;
  defaultValue?: string;
  /** Крок хвилин у колонці. */
  step?: number;
  quick?: string[];
  className?: string;
}) {
  const initial = parse(defaultValue) ? defaultValue : "17:00";
  const [value, setValue] = useState(initial);
  const [open, setOpen] = useState(false);
  const [col, setCol] = useState<0 | 1>(0);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const style = useAnchoredPopup(button, open, 320, "left", 232);
  const [h, m] = parse(value) ?? [17, 0];
  // Хвилини з кроком; якщо збережене значення поза кроком (напр. 17:07) — теж показуємо його
  const minutes = Array.from({ length: 60 / step }, (_, i) => i * step);
  if (!minutes.includes(m)) {
    minutes.push(m);
    minutes.sort((a, b) => a - b);
  }

  // Після помилки форма приходить з новим defaultValue — підхоплюємо його
  const [prevInitial, setPrevInitial] = useState(initial);
  if (prevInitial !== initial) {
    setPrevInitial(initial);
    setValue(initial);
  }

  // form.reset() не знає про стан React — повертаємо початкове значення
  useEffect(() => {
    const form = root.current?.closest("form");
    if (!form) return;
    const onReset = () => setValue(initial);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [initial]);

  // Клік поза вікном закриває його
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!root.current?.contains(t) && !pop.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Обране значення — по центру колонок; фокус — на активній колонці
  useEffect(() => {
    if (!open || !style) return;
    pop.current?.querySelectorAll<HTMLElement>("[aria-selected='true']").forEach((el) => {
      // Прокручуємо лише колонку, не сторінку
      const list = el.parentElement;
      if (list) list.scrollTop = el.offsetTop - list.offsetTop - list.clientHeight / 2 + el.offsetHeight / 2;
    });
  }, [open, style, value]);
  useEffect(() => {
    if (open && style) pop.current?.querySelector<HTMLElement>(`[data-col="${col}"] [aria-selected='true']`)?.focus({ preventScroll: true });
  }, [open, style, col, value]);

  function close() {
    setOpen(false);
    button.current?.focus();
  }

  const set = (hh: number, mm: number) => setValue(`${pad(hh)}:${pad(mm)}`);

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const mi = minutes.indexOf(m);
    const actions: Record<string, () => void> = {
      ArrowUp: () => (col === 0 ? set((h + 23) % 24, m) : set(h, minutes[(mi - 1 + minutes.length) % minutes.length])),
      ArrowDown: () => (col === 0 ? set((h + 1) % 24, m) : set(h, minutes[(mi + 1) % minutes.length])),
      ArrowLeft: () => setCol(0),
      ArrowRight: () => setCol(1),
      Enter: close,
      Escape: close,
    };
    if (actions[e.key]) {
      e.preventDefault();
      actions[e.key]();
    }
  }

  const cell = (selected: boolean) =>
    `flex h-9 w-full shrink-0 items-center justify-center rounded-xl font-mono text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent ${
      selected ? "bg-text font-bold text-white shadow-pill" : "text-soft hover:bg-surface-2 hover:text-text"
    }`;

  return (
    <div ref={root} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        ref={button}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? `${id}-dialog` : undefined}
        aria-label={`Час: ${value}. Змінити`}
        onClick={() => {
          setCol(0);
          setOpen((o) => !o);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setCol(0);
            setOpen(true);
          }
        }}
        className={`field flex items-center gap-2 text-left font-normal ${open ? "border-line-2 bg-white ring-4 ring-accent/12" : ""} ${className}`}
      >
        <IconClock size={16} className={`shrink-0 ${open ? "text-accent" : "text-muted"}`} />
        <span className="flex-1 font-mono text-text tabular-nums">{value}</span>
      </button>

      {open &&
        style &&
        createPortal(
          <div
            ref={pop}
            id={`${id}-dialog`}
            role="dialog"
            aria-label="Оберіть час"
            onKeyDown={onKey}
            style={{ ...style, minWidth: undefined, maxHeight: undefined }}
            className="select-pop z-[100] w-[232px] rounded-3xl border border-line bg-white p-3 shadow-lift"
          >
            <div className="mb-2 grid grid-cols-2 gap-2 px-1 text-center text-xs font-semibold text-faint">
              <span>Години</span>
              <span>Хвилини</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 0 as const, label: "Години", items: HOURS, current: h, pick: (n: number) => set(n, m) },
                { key: 1 as const, label: "Хвилини", items: minutes, current: m, pick: (n: number) => set(h, n) },
              ].map((c) => (
                <div
                  key={c.key}
                  data-col={c.key}
                  role="listbox"
                  aria-label={c.label}
                  className="flex h-52 flex-col gap-0.5 overflow-y-auto overscroll-contain rounded-2xl bg-surface-2/60 p-1 [scrollbar-width:thin]"
                >
                  {c.items.map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="option"
                      aria-selected={n === c.current}
                      tabIndex={n === c.current ? 0 : -1}
                      onFocus={() => setCol(c.key)}
                      onClick={() => {
                        c.pick(n);
                        setCol(c.key);
                        if (c.key === 1) close();
                      }}
                      className={cell(n === c.current)}
                    >
                      {pad(n)}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Швидкий вибір */}
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
              {quick.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setValue(q);
                    close();
                  }}
                  className={`rounded-full px-2.5 py-1.5 font-mono text-xs font-semibold transition-colors ${value === q ? "bg-text text-white" : "bg-surface-2 text-soft hover:bg-line"}`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
