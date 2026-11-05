/**
 * Планувальник учня — чисті функції без бази: дні тижня, час, навантаження, привітання робота.
 * Тести: src/lib/__tests__/planner.test.ts
 */

export const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"] as const;
export const WEEKDAYS_FULL = ["Понеділок", "Вівторок", "Середа", "Четвер", "П’ятниця", "Субота", "Неділя"] as const;

export const SLOT_KINDS = {
  lesson: "Урок",
  homework: "Домашка",
  practice: "Практика",
  rest: "Відпочинок",
  other: "Інше",
} as const;
export type SlotKindId = keyof typeof SLOT_KINDS;

export const PRIORITIES = { high: "Важливо", normal: "Звичайно", low: "Не горить" } as const;
export type PriorityId = keyof typeof PRIORITIES;

/** «17:30» → 1050. Некоректний час — null. */
export function parseTime(v: string): number | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(v.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** 1050 → «17:30». */
export function formatTime(minute: number): string {
  const h = Math.floor(minute / 60) % 24;
  const m = minute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** «1 год 30 хв», «45 хв», «2 год». */
export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} хв`;
  return m ? `${h} год ${m} хв` : `${h} год`;
}

/** День тижня у Києві: 0 — понеділок … 6 — неділя. */
export function kyivWeekday(now: Date = new Date()): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Kyiv", weekday: "short" }).format(now);
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(name);
}

/** Дата у Києві як «2026-11-05» — щоб порівнювати дедлайни з «сьогодні». */
export function kyivDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Kyiv" }).format(now);
}

/** Година у Києві (0–23) — для «Доброго ранку / дня / вечора». */
export function kyivHour(now: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kyiv", hour: "2-digit", hourCycle: "h23" }).format(now));
}

export function greeting(hour: number): string {
  if (hour >= 5 && hour < 12) return "Доброго ранку";
  if (hour >= 12 && hour < 18) return "Доброго дня";
  if (hour >= 18 && hour < 23) return "Доброго вечора";
  return "Привіт, сова";
}

export type SlotLike = { weekday: number; startMinute: number; durationMinutes: number; kind: SlotKindId };

/** Хвилини навчання по днях (відпочинок не рахується). */
export function minutesByDay(slots: SlotLike[]): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0];
  for (const s of slots) if (s.kind !== "rest" && s.weekday >= 0 && s.weekday < 7) out[s.weekday] += s.durationMinutes;
  return out;
}

/** Чи накладається новий слот на наявні в той самий день. */
export function overlaps(slots: Pick<SlotLike, "weekday" | "startMinute" | "durationMinutes">[], next: Pick<SlotLike, "weekday" | "startMinute" | "durationMinutes">): boolean {
  const end = next.startMinute + next.durationMinutes;
  return slots.some((s) => s.weekday === next.weekday && s.startMinute < end && next.startMinute < s.startMinute + s.durationMinutes);
}

/** Стан навантаження дня відносно бажаного: вільно / норма / забагато. */
export function loadLevel(minutes: number, target: number): "free" | "ok" | "over" {
  if (minutes === 0) return "free";
  return minutes > target * 1.25 ? "over" : "ok";
}

export type TaskLike = { done: boolean; doneAt: Date | null; dueDate: Date | null };

/** Скільки задач закрито за останні 7 днів і скільки прострочено. */
export function taskStats(tasks: TaskLike[], now: Date = new Date()) {
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const today = kyivDay(now);
  return {
    open: tasks.filter((t) => !t.done).length,
    doneThisWeek: tasks.filter((t) => t.done && t.doneAt && t.doneAt.getTime() > weekAgo).length,
    overdue: tasks.filter((t) => !t.done && t.dueDate && t.dueDate.toISOString().slice(0, 10) < today).length,
  };
}

/** Середня оцінка за перевірені домашки у відсотках (null — оцінок ще немає). */
export function averageScore(items: { score: number | null; maxScore: number }[]): number | null {
  const graded = items.filter((i) => i.score != null && i.maxScore > 0);
  if (!graded.length) return null;
  return Math.round((graded.reduce((s, i) => s + i.score! / i.maxScore, 0) / graded.length) * 100);
}

/** 1 заняття, 2 заняття, 5 занять, 21 заняття. */
export function pluralLessons(n: number): string {
  const d = n % 10;
  const dd = n % 100;
  return d >= 1 && d <= 4 && !(dd >= 11 && dd <= 14) ? "заняття" : "занять";
}

/**
 * Що скаже робот при вході: підказка з розкладу, домашок і задач учня.
 */
export function robotMessage(input: {
  todaySlots: { title: string; startMinute: number }[];
  overdueHomework: number;
  dueSoonHomework: number;
  openTasks: number;
  streak: number;
  hasSchedule: boolean;
}): string {
  if (input.overdueHomework) return `Є прострочена домашка (${input.overdueHomework}). Давай закриємо її першою — і далі буде легше!`;
  const next = [...input.todaySlots].sort((a, b) => a.startMinute - b.startMinute)[0];
  if (next) return `Сьогодні в розкладі ${input.todaySlots.length} ${pluralLessons(input.todaySlots.length)}. Перше — «${next.title}» о ${formatTime(next.startMinute)}.`;
  if (input.dueSoonHomework) return `Скоро дедлайн домашки — краще здати її заздалегідь, і вихідні будуть вільні 😉`;
  if (!input.hasSchedule) return "Склади розклад на тиждень — і я щодня нагадуватиму, що на черзі!";
  if (input.streak >= 3) return `Серія ${input.streak} дні поспіль — так тримати! Не зупиняйся сьогодні.`;
  if (input.openTasks) return `У списку ${input.openTasks} відкритих задач. Обери одну маленьку — і вперед!`;
  return "Сьогодні вільний день. Може, один короткий урок для серії? 🚀";
}
