"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { IconCalendar, IconChevronDown, IconX } from "@/components/icons";
import { useAnchoredPopup } from "@/components/use-anchored-popup";
import { WEEKDAYS, kyivDay } from "@/lib/planner";

/** Дати — рядки «2026-11-05»; рахуємо в UTC, щоб часовий пояс браузера не зсував день. */
const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => toIso(new Date(toDate(iso).getTime() + n * 86_400_000));
const addMonths = (iso: string, n: number) => {
  const d = toDate(iso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return toIso(d);
};
const monthKey = (iso: string) => iso.slice(0, 7);
const weekdayMon0 = (iso: string) => (toDate(iso).getUTCDay() + 6) % 7;

const fmtMonth = new Intl.DateTimeFormat("uk-UA", { month: "long", year: "numeric", timeZone: "UTC" });
const fmtDay = new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", timeZone: "UTC" });
const fmtFull = new Intl.DateTimeFormat("uk-UA", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** 42 дні (6 тижнів) сітки місяця, що починається з понеділка. */
function monthGrid(anyDayOfMonth: string): string[] {
  const first = `${monthKey(anyDayOfMonth)}-01`;
  const start = addDays(first, -weekdayMon0(first));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/**
 * Власний календар замість системного <input type="date">.
 * Значення («2026-11-05» або порожньо) йде у форму через приховане поле `name`.
 * Клавіатура: стрілки — день/тиждень, PageUp/PageDown — місяць, Home/End — початок/кінець тижня,
 * Enter/Пробіл — обрати, Esc — закрити.
 */
export function DatePicker({
  name,
  defaultValue,
  min,
  placeholder = "Обрати дату",
  className = "",
}: {
  name: string;
  defaultValue?: string;
  /** Найраніша дата, яку можна обрати («2026-11-05»). */
  min?: string;
  placeholder?: string;
  className?: string;
}) {
  const initial = defaultValue && /^\d{4}-\d{2}-\d{2}$/.test(defaultValue) ? defaultValue : "";
  const [value, setValue] = useState(initial);
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState(() => kyivDay());
  const [focused, setFocused] = useState(initial || today);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const style = useAnchoredPopup(button, open, 400, "left", 296);

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

  // Клік поза календарем закриває його
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!root.current?.contains(t) && !pop.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Фокус іде за «активним» днем сітки (roving tabindex)
  useEffect(() => {
    if (open && style) pop.current?.querySelector<HTMLButtonElement>(`[data-day="${focused}"]`)?.focus();
  }, [open, style, focused]);

  const disabled = (iso: string) => !!min && iso < min;

  function show() {
    const now = kyivDay();
    setToday(now);
    setFocused(value || (min && now < min ? min : now));
    setOpen(true);
  }

  function close() {
    setOpen(false);
    button.current?.focus();
  }

  function choose(iso: string) {
    if (disabled(iso)) return;
    setValue(iso);
    close();
  }

  function onGridKey(e: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      Home: () => addDays(focused, -weekdayMon0(focused)),
      End: () => addDays(focused, 6 - weekdayMon0(focused)),
      PageUp: () => addMonths(focused, e.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focused, e.shiftKey ? 12 : 1),
    };
    if (moves[e.key]) {
      e.preventDefault();
      setFocused(moves[e.key]());
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  const days = monthGrid(focused);
  const shortcuts = [
    { label: "Сьогодні", iso: today },
    { label: "Завтра", iso: addDays(today, 1) },
    { label: "За тиждень", iso: addDays(today, 7) },
  ];

  return (
    <div ref={root} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        ref={button}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? `${id}-dialog` : undefined}
        aria-label={value ? `Дата: ${fmtFull.format(toDate(value))}. Змінити` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            show();
          }
        }}
        className={`field flex items-center gap-2 text-left font-normal ${open ? "border-line-2 bg-white ring-4 ring-accent/12" : ""} ${className}`}
      >
        <IconCalendar size={16} className={`shrink-0 ${open || value ? "text-accent" : "text-muted"}`} />
        <span className={`min-w-0 flex-1 truncate ${value ? "text-text" : "text-faint"}`}>{value ? fmtDay.format(toDate(value)) : placeholder}</span>
      </button>

      {open &&
        style &&
        createPortal(
          <div
            ref={pop}
            id={`${id}-dialog`}
            role="dialog"
            aria-modal="false"
            aria-label="Оберіть дату"
            style={{ ...style, minWidth: undefined, maxHeight: undefined }}
            className="select-pop z-[100] w-[296px] rounded-3xl border border-line bg-white p-4 shadow-lift"
          >
            {/* Місяць і перемикачі */}
            <div className="mb-3 flex items-center justify-between">
              <button type="button" onClick={() => setFocused(addMonths(focused, -1))} className="flex h-9 w-9 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-accent" aria-label="Попередній місяць">
                <IconChevronDown size={18} className="rotate-90" />
              </button>
              <span className="font-display text-[15px] font-bold capitalize" aria-live="polite">
                {fmtMonth.format(toDate(focused)).replace(" р.", "")}
              </span>
              <button type="button" onClick={() => setFocused(addMonths(focused, 1))} className="flex h-9 w-9 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-accent" aria-label="Наступний місяць">
                <IconChevronDown size={18} className="-rotate-90" />
              </button>
            </div>

            {/* Сітка днів */}
            <div role="grid" aria-label={fmtMonth.format(toDate(focused))} onKeyDown={onGridKey}>
              <div role="row" className="mb-1 grid grid-cols-7">
                {WEEKDAYS.map((d, i) => (
                  <span key={d} role="columnheader" className={`py-1 text-center text-xs font-semibold ${i >= 5 ? "text-pink" : "text-faint"}`}>
                    {d}
                  </span>
                ))}
              </div>
              {[0, 1, 2, 3, 4, 5].map((w) => (
                <div key={w} role="row" className="grid grid-cols-7 gap-0.5">
                  {days.slice(w * 7, w * 7 + 7).map((iso) => {
                    const inMonth = monthKey(iso) === monthKey(focused);
                    const isSel = iso === value;
                    const isToday = iso === today;
                    const off = disabled(iso);
                    return (
                      <div key={iso} role="gridcell" aria-selected={isSel}>
                        <button
                          type="button"
                          data-day={iso}
                          tabIndex={iso === focused ? 0 : -1}
                          disabled={off}
                          onClick={() => choose(iso)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              choose(iso);
                            }
                          }}
                          aria-label={`${fmtFull.format(toDate(iso))}${isToday ? ", сьогодні" : ""}`}
                          aria-current={isToday ? "date" : undefined}
                          className={`relative flex h-9 w-full items-center justify-center rounded-xl text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
                            isSel
                              ? "bg-text font-bold text-white shadow-pill"
                              : off
                                ? "cursor-not-allowed text-line-2"
                                : `${inMonth ? "text-text" : "text-faint/70"} hover:bg-surface-2 ${isToday ? "font-bold ring-1 ring-text/30" : ""}`
                          }`}
                        >
                          {toDate(iso).getUTCDate()}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Швидкий вибір */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
              {shortcuts.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  disabled={disabled(s.iso)}
                  onClick={() => choose(s.iso)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${value === s.iso ? "bg-text text-white" : "bg-surface-2 text-soft hover:bg-line"}`}
                >
                  {s.label}
                </button>
              ))}
              {value && (
                <button
                  type="button"
                  onClick={() => {
                    setValue("");
                    close();
                  }}
                  className="ml-auto flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-muted hover:bg-danger/10 hover:text-danger"
                >
                  <IconX size={12} /> Очистити
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
