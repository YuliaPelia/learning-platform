"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconChevronDown } from "@/components/icons";
import { useAnchoredPopup } from "@/components/use-anchored-popup";

export type SelectOption = { value: string; label: string; /** Кольорова мітка перед назвою (класи Tailwind, напр. "bg-accent") */ dot?: string };

/**
 * Власний випадний список замість системного <select>.
 * Значення йде у форму через приховане поле `name`, тож серверні дії працюють як зі звичайним select.
 * Доступність — патерн WAI-ARIA «select-only combobox»: стрілки, Home/End, Enter/Пробіл, Esc,
 * пошук за першими літерами; обгортковий <label> дає кнопці назву.
 * Список рендериться в <body> з position: fixed — інакше його перекривають сусідні «скляні» блоки
 * (backdrop-filter створює власний шар, і z-index усередині нього не допомагає).
 */
export function Select({
  name,
  options,
  defaultValue,
  className = "",
  onChange,
}: {
  name: string;
  options: SelectOption[];
  defaultValue?: string;
  className?: string;
  onChange?: (value: string) => void;
}) {
  const initial = options.some((o) => o.value === defaultValue) ? defaultValue! : (options[0]?.value ?? "");
  const [value, setValue] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const selected = options.find((o) => o.value === value) ?? options[0];

  // Після помилки форма приходить з новим defaultValue — підхоплюємо його (без зайвого ефекту)
  const [prevInitial, setPrevInitial] = useState(initial);
  if (prevInitial !== initial) {
    setPrevInitial(initial);
    setValue(initial);
  }

  // form.reset() не знає про стан React — повертаємо початкове значення самі
  useEffect(() => {
    const form = root.current?.closest("form");
    if (!form) return;
    const onReset = () => setValue(initial);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [initial]);

  // Клік поза списком закриває його
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!root.current?.contains(t) && !list.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const pos = useAnchoredPopup(button, open, Math.min(256, options.length * 40 + 14));

  // Активний пункт завжди видно в прокрученому списку
  useEffect(() => {
    if (open) document.getElementById(`${id}-opt-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, id]);

  function show() {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }

  function choose(i: number) {
    const v = options[i]?.value;
    if (v === undefined) return;
    setValue(v);
    onChange?.(v);
    setOpen(false);
    button.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const last = options.length - 1;
    const keys: Record<string, () => void> = {
      ArrowDown: () => (open ? setActive((a) => Math.min(last, a + 1)) : show()),
      ArrowUp: () => (open ? setActive((a) => Math.max(0, a - 1)) : show()),
      Home: () => open && setActive(0),
      End: () => open && setActive(last),
      Enter: () => (open ? choose(active) : show()),
      " ": () => (open ? choose(active) : show()),
      Escape: () => setOpen(false),
      Tab: () => open && choose(active),
    };
    const action = keys[e.key];
    if (action) {
      if (e.key !== "Tab" && (e.key !== "Escape" || open)) e.preventDefault();
      action();
      return;
    }
    // Пошук за першими літерами («ср» → Середа)
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + e.key.toLowerCase(), at: now };
      const i = options.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text));
      if (i === -1) return;
      if (open) setActive(i);
      else choose(i);
    }
  }

  return (
    <div ref={root} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        ref={button}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        className={`field flex items-center justify-between gap-2 text-left font-normal ${open ? "border-line-2 bg-white ring-4 ring-accent/12" : ""} ${className}`}
      >
        <span className="flex min-w-0 items-center gap-2 text-text">
          {selected?.dot && <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${selected.dot}`} aria-hidden />}
          <span className="truncate">{selected?.label}</span>
        </span>
        <IconChevronDown size={16} className={`shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180 text-accent" : ""}`} />
      </button>

      {open && pos && createPortal(
        <ul
          ref={list}
          style={pos}
          id={`${id}-list`}
          role="listbox"
          tabIndex={-1}
          className="select-pop z-[100] overflow-auto rounded-2xl border border-line bg-white p-1.5 shadow-lift"
        >
          {options.map((o, i) => {
            const isSelected = o.value === value;
            return (
              <li
                key={o.value}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={isSelected}
                onPointerEnter={() => setActive(i)}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
                className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm whitespace-nowrap select-none ${
                  i === active ? "bg-surface-2 text-text" : "text-soft"
                } ${isSelected ? "font-semibold text-accent" : ""}`}
              >
                {o.dot && <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${o.dot}`} aria-hidden />}
                <span className="flex-1">{o.label}</span>
                <IconCheck size={14} className={isSelected ? "text-accent" : "invisible"} />
              </li>
            );
          })}
        </ul>,
        document.body,
      )}
    </div>
  );
}
