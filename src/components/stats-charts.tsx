import type { DayPoint } from "@/lib/stats-utils";

const shortDay = new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "short", timeZone: "UTC" });
const labelOf = (key: string) => shortDay.format(new Date(`${key}T00:00:00Z`));

/**
 * Стовпчаста діаграма по днях. Чистий SVG без бібліотек: адаптивна, підписи в <title> (підказка при
 * наведенні), загальний опис у aria-label. `format` форматує значення для підписів.
 */
export function BarChart({
  title,
  points,
  format = (n) => String(n),
  gradientId,
}: {
  title: string;
  points: DayPoint[];
  format?: (n: number) => string;
  gradientId: string;
}) {
  const W = 600;
  const H = 150;
  const pad = { top: 10, bottom: 22 };
  const max = Math.max(1, ...points.map((p) => p.value));
  const slot = W / points.length;
  const bar = Math.max(3, slot - 4);
  const total = points.reduce((a, p) => a + p.value, 0);
  const innerH = H - pad.top - pad.bottom;

  return (
    <figure className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${title}: усього ${format(total)} за ${points.length} днів`}
        className="h-auto w-full overflow-visible"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9a5cf2" />
            <stop offset="1" stopColor="#6d4aff" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((t) => (
          <line key={t} x1="0" x2={W} y1={pad.top + innerH * (1 - t)} y2={pad.top + innerH * (1 - t)} stroke="var(--color-line)" strokeDasharray={t === 0 ? undefined : "3 5"} />
        ))}
        {points.map((p, i) => {
          const h = p.value === 0 ? 2 : Math.max(4, (p.value / max) * innerH);
          return (
            <rect
              key={p.day}
              x={i * slot + (slot - bar) / 2}
              y={pad.top + innerH - h}
              width={bar}
              height={h}
              rx={Math.min(4, bar / 2)}
              fill={p.value === 0 ? "var(--color-line)" : `url(#${gradientId})`}
            >
              <title>{`${labelOf(p.day)}: ${format(p.value)}`}</title>
            </rect>
          );
        })}
        {[0, Math.floor(points.length / 2), points.length - 1].map((i) => (
          <text key={i} x={i * slot + slot / 2} y={H - 4} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} className="fill-faint text-[11px]">
            {labelOf(points[i].day)}
          </text>
        ))}
      </svg>
      <figcaption className="flex items-baseline justify-between text-sm text-muted">
        <span>{title}</span>
        <span>
          пік за день: <b className="text-text">{format(max === 1 && total === 0 ? 0 : max)}</b>
        </span>
      </figcaption>
    </figure>
  );
}

/** Горизонтальні смуги «назва — значення»: для розподілів (тарифи, статуси домашок). */
export function HBars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.label} className="flex flex-col gap-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-soft">{r.label}</span>
            <b>{r.value}</b>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-line">
            <div className="bg-brand h-full rounded-full" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
