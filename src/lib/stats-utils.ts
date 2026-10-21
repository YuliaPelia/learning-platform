import { dayKey } from "./gamification";

export const STATS_DAYS = 30;

export type DayPoint = { day: string; value: number };

/** Ключ дня, зсунутий на `back` календарних днів назад (арифметика по датах — стійка до переходу на літній час). */
function shiftDayKey(key: string, back: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - back)).toISOString().slice(0, 10);
}

/** Розкладає події по днях за останні `days` днів (включно з сьогодні) за київським часом; дні без подій дають 0. */
export function bucketByDay(items: { at: Date | null; value?: number }[], days = STATS_DAYS, now = new Date()): DayPoint[] {
  const today = dayKey(now);
  const keys = Array.from({ length: days }, (_, i) => shiftDayKey(today, days - 1 - i));
  const sums = new Map(keys.map((k) => [k, 0]));
  for (const it of items) {
    if (!it.at) continue;
    const k = dayKey(it.at);
    if (sums.has(k)) sums.set(k, sums.get(k)! + (it.value ?? 1));
  }
  return keys.map((day) => ({ day, value: sums.get(day)! }));
}

export const sumPoints = (pts: DayPoint[]) => pts.reduce((a, p) => a + p.value, 0);

/** Зміна у відсотках відносно попереднього періоду; null — порівнювати нема з чим. */
export function deltaPercent(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
