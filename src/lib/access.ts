/**
 * Правила доступу до уроків — "охоронець на вході".
 * Чисті функції без бази даних: їх легко тестувати (див. access.test.ts).
 */
import { FREE_LESSONS, GRACE_DAYS, PLANS, type PlanId } from "./plans";

export type SubscriptionLike = {
  plan: PlanId;
  courseId: string | null;
  status: "pending" | "active" | "past_due" | "canceled";
  currentPeriodEnd: Date | null;
};

export type AccessReason = "ok" | "coming_soon" | "locked_sequence" | "needs_subscription";

const DAY = 24 * 60 * 60 * 1000;

/** Чи діє підписка саме зараз. */
export function isSubscriptionLive(sub: SubscriptionLike, now: Date = new Date()): boolean {
  if (!sub.currentPeriodEnd) return false;
  const end = sub.currentPeriodEnd.getTime();
  switch (sub.status) {
    case "active":
    case "canceled": // скасована — доступ до кінця оплаченого місяця
      return end > now.getTime();
    case "past_due": // списання не пройшло — даємо кілька днів пільги
      return end + GRACE_DAYS * DAY > now.getTime();
    default:
      return false;
  }
}

/** Чи покриває підписка цей курс. */
export function subscriptionCoversCourse(sub: SubscriptionLike, courseId: string): boolean {
  return PLANS[sub.plan].allCourses || sub.courseId === courseId;
}

/** Найкраща діюча підписка дитини для курсу (або null). */
export function findCoveringSubscription<T extends SubscriptionLike>(
  subs: T[],
  courseId: string,
  now: Date = new Date(),
): T | null {
  return subs.find((s) => isSubscriptionLive(s, now) && subscriptionCoversCourse(s, courseId)) ?? null;
}

export function canAccessLesson(params: {
  courseStatus: "published" | "soon";
  courseId: string;
  lessonOrder: number;
  previousLessonCompleted: boolean;
  subscriptions: SubscriptionLike[];
  now?: Date;
}): AccessReason {
  const { courseStatus, courseId, lessonOrder, previousLessonCompleted, subscriptions, now } = params;
  if (courseStatus !== "published") return "coming_soon";
  // Крок за кроком: наступний урок відкривається лише після попереднього.
  if (lessonOrder > 1 && !previousLessonCompleted) return "locked_sequence";
  if (lessonOrder <= FREE_LESSONS) return "ok";
  return findCoveringSubscription(subscriptions, courseId, now) ? "ok" : "needs_subscription";
}

/** Дата кінця наступного оплаченого періоду: +1 календарний місяць від max(зараз, поточний кінець). */
export function extendPeriod(currentEnd: Date | null, now: Date = new Date()): Date {
  const base = currentEnd && currentEnd.getTime() > now.getTime() ? new Date(currentEnd) : new Date(now);
  const next = new Date(base);
  next.setMonth(next.getMonth() + 1);
  // 31 січня + 1 місяць у JS дає 3 березня — підрізаємо до останнього дня місяця
  if (next.getDate() !== base.getDate()) next.setDate(0);
  return next;
}
