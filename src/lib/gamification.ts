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

export function levelFromXp(rawXp: number) {
  const xp = Math.max(0, rawXp);
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

/** Попередній календарний день для ключа YYYY-MM-DD (арифметика по датах, а не по 24 годинах — стійка до переходу на літній час). */
function prevDayKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

/**
 * Серія днів поспіль з навчанням. Якщо сьогодні ще не вчився,
 * серія, що закінчилась учора, ще "жива". Кілька дій за день — це один день.
 */
export function streakDays(activity: Date[], now: Date = new Date()): number {
  const days = new Set(activity.map((d) => dayKey(d)));
  let cursor = dayKey(now);
  if (!days.has(cursor)) cursor = prevDayKey(cursor);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = prevDayKey(cursor);
  }
  return streak;
}

/** XP за здану (або зараховану) домашку. */
export const HOMEWORK_XP = 50;

/**
 * XP виводиться з фактів (пройдені уроки + здані домашки), а не накопичується лічильником,
 * тому повторна дія не може нарахувати його вдруге: кожен урок і кожна домашка враховуються один раз.
 */
export function totalXp(lessonXp: number[], submittedHomework: number): number {
  return lessonXp.reduce((s, x) => s + x, 0) + submittedHomework * HOMEWORK_XP;
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
