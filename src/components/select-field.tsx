"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

export type SelectOption = { value: string; label: string };

/** Випадаючий список у стилі сайту. Значення йде у форму через прихований input з name. */
export function SelectField({
  id,
  name,
  options,
  defaultValue,
  value: controlled,
  onChange,
  required,
}: {
  id: string;
  name: string;
  options: SelectOption[];
  defaultValue?: string;
  /** Керований режим: передайте value і onChange разом. */
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [inner, setInner] = useState(defaultValue ?? options[0]?.value ?? "");
  const value = controlled ?? inner;
  const [active, setActive] = useState(() => Math.max(0, options.findIndex((o) => o.value === value)));
  const selected = options.find((o) => o.value === value);

  // Закриваємо список при кліку поза ним
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function openList() {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }

  function choose(index: number) {
    const opt = options[index];
    if (!opt) return;
    if (controlled === undefined) setInner(opt.value);
    onChange?.(opt.value);
    setActive(index);
    setOpen(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement | HTMLUListElement>) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-required={required}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className="field flex cursor-pointer items-center justify-between text-left focus:border-accent"
      >
        <span className="truncate">{selected?.label}</span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className={`ml-3 h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          tabIndex={-1}
          autoFocus
          onKeyDown={onKeyDown}
          className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-line-2 bg-surface-2 p-1 shadow-2xl shadow-black/40 outline-none"
        >
          {options.map((o, i) => {
            const isSelected = o.value === value;
            const isActive = i === active;
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
                className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 transition-colors ${
                  isActive ? "bg-line" : ""
                } ${isSelected ? "font-semibold text-accent" : "text-soft"}`}
              >
                <span className="truncate">{o.label}</span>
                {isSelected && (
                  <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} className="ml-3 h-4 w-4 shrink-0">
                    <path d="M4.5 10.5 8 14l7.5-8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
