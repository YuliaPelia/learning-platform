"use client";

import Link from "next/link";
import { useState } from "react";

export type CatalogGroup = {
  id: string;
  title: string;
  age: string;
  note: string;
  kind: "start" | "code" | "design";
  courses: { slug: string; title: string; published: boolean }[];
};

const FILTERS = [
  { id: "all", label: "Усі" },
  { id: "start", label: "Ігри" },
  { id: "code", label: "Код" },
  { id: "design", label: "Дизайн" },
] as const;

/** Каталог курсів з фільтром. "use client" — бо тут є стан (обраний фільтр). */
export function CourseCatalog({ groups }: { groups: CatalogGroup[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const shown = filter === "all" ? groups : groups.filter((g) => g.kind === filter);

  return (
    <div className="flex flex-col gap-9">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="flex flex-col gap-2.5">
          <h2 className="font-display text-4xl font-bold">Курси</h2>
          <p className="text-lg text-muted">Навчання лише за програмою ITCodeCraft — усе всередині платформи</p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Фільтр курсів">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`h-11 rounded-xl border px-4 font-semibold ${
                filter === f.id ? "border-accent bg-accent text-ink" : "border-line-2 text-soft hover:bg-surface-2"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {shown.map((g) => (
          <div key={g.id} className="card flex min-h-[236px] flex-col gap-4 p-7">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[22px] font-bold">{g.title}</h3>
              <span className="shrink-0 rounded-full bg-[#262b52] px-3 py-1 text-[13px] whitespace-nowrap text-soft">{g.age}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {g.courses.map((c) =>
                c.published ? (
                  <Link
                    key={c.slug}
                    href={`/courses/${c.slug}`}
                    className="flex h-9 items-center rounded-[10px] border border-accent/60 px-3 text-[15px] hover:bg-accent hover:text-ink"
                  >
                    {c.title}
                  </Link>
                ) : (
                  <span key={c.slug} className="flex h-9 items-center gap-1.5 rounded-[10px] border border-line-2 px-3 text-[15px] text-muted">
                    {c.title}
                    <span className="text-[11px] text-amber">скоро</span>
                  </span>
                ),
              )}
            </div>
            <p className="mt-auto text-[15px] text-muted">{g.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
