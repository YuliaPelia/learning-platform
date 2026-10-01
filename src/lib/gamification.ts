/**
 * Ігрові механіки: XP, рівні, серія днів, бейджі.
 * Усе рахується з прогресу — окремих таблиць не потрібно.
 */

export const LEVELS = [
  { level: 1, title: "Новачок", xp: 0 },
  { level: 2, title: "Учень", xp: 200 },
  { level: 3, title: "Практик", xp: 400 },
  { level: 4, title: "Дослідник", xp: 600 },
  { level: 5, title: "Майстер", xp: 800 },
  { level: 6, title: "Творець", xp: 1200 },
  { level: 7, title: "Легенда", xp: 1800 },
] as const;

export function levelFromXp(xp: number) {
  let current: (typeof LEVELS)[number] = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.xp) current = l;
  const next = LEVELS.find((l) => l.xp > xp) ?? null;
  const progress = next ? (xp - current.xp) / (next.xp - current.xp) : 1;
  return { ...current, nextXp: next?.xp ?? null, toNext: next ? next.xp - xp : 0, progress };
}

/** Ключ дня в київському часовому поясі (YYYY-MM-DD). */
export function dayKey(d: Date, timeZone = "Europe/Kyiv"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/**
 * Серія днів поспіль з навчанням. Якщо сьогодні ще не вчився,
 * серія, що закінчилась учора, ще "жива".
 */
export function streakDays(activity: Date[], now: Date = new Date()): number {
  const days = new Set(activity.map((d) => dayKey(d)));
  const cursor = new Date(now);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export type Badge = { id: string; title: string; description: string; earned: boolean };

export function computeBadges(input: {
  completedLessons: number;
  submittedHomework: number;
  streak: number;
  finishedCourses: number;
}): Badge[] {
  return [
    { id: "first-lesson", title: "Перша програма", description: "Пройди перший урок", earned: input.completedLessons >= 1 },
    { id: "five-lessons", title: "Розігнався", description: "Пройди 5 уроків", earned: input.completedLessons >= 5 },
    { id: "homework", title: "Відмінник", description: "Здай 3 домашки", earned: input.submittedHomework >= 3 },
    { id: "streak-7", title: "Тиждень без пропусків", description: "Навчайся 7 днів поспіль", earned: input.streak >= 7 },
    { id: "course", title: "Курс пройдено", description: "Заверши всі уроки курсу", earned: input.finishedCourses >= 1 },
  ];
}
