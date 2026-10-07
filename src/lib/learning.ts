import "server-only";
import { prisma } from "@/db";
import type { Plan as PlanRow, Subscription } from "@/generated/prisma/client";
import { canAccessLesson, findCoveringSubscription, isSubscriptionLive, type AccessReason, type SubscriptionLike } from "./access";
import { computeBadges, levelFromXp, streakDays } from "./gamification";
import { PLANS, type Plan, type PlanId } from "./plans";

/** Підписка з бази → форма, з якою працюють чисті правила доступу (access.ts). */
export function toAccessSub(sub: Subscription & { plan: PlanRow }): SubscriptionLike {
  return { plan: sub.plan.code, courseId: sub.courseId, status: sub.status, currentPeriodEnd: sub.endsAt };
}

/** Тарифи для показу: назва й ціна з бази + можливості з plans.ts. */
export async function getPlanCatalog(): Promise<Plan[]> {
  const rows = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { rank: "asc" } });
  return rows.map((r) => ({ ...PLANS[r.code], name: r.name, price: r.price / 100 }));
}

/** Усі підписки дитини (у формі для правил доступу). */
export async function getStudentSubscriptions(studentId: string) {
  const subs = await prisma.subscription.findMany({
    where: { studentId },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
  return subs.map(toAccessSub);
}

/** Найкращий діючий тариф дитини (для бейджів/викладача): premium > standard > basic. */
export function bestLivePlan(subs: SubscriptionLike[]): PlanId | null {
  const live = subs.filter((s) => isSubscriptionLive(s));
  for (const p of ["premium", "standard", "basic"] as const) if (live.some((s) => s.plan === p)) return p;
  return null;
}

export async function getCourseBySlug(slug: string) {
  return prisma.course.findUnique({
    where: { slug },
    include: { minPlan: true, lessons: { orderBy: { order: "asc" }, include: { homework: true } } },
  });
}

export async function getCompletedLessonIds(studentId: string, lessonIds: string[]) {
  if (!lessonIds.length) return new Set<string>();
  const rows = await prisma.progress.findMany({
    where: { userId: studentId, completed: true, lessonId: { in: lessonIds } },
    select: { lessonId: true },
  });
  return new Set(rows.map((r) => r.lessonId));
}

/** Стан кожного уроку курсу для конкретної дитини. */
export async function getCourseState(slug: string, studentId: string | null) {
  const course = await getCourseBySlug(slug);
  if (!course) return null;
  const { lessons } = course;
  const completed = studentId ? await getCompletedLessonIds(studentId, lessons.map((l) => l.id)) : new Set<string>();
  const subs = studentId ? await getStudentSubscriptions(studentId) : [];
  const minPlan = course.minPlan.code;
  const items = lessons.map((lesson, idx) => {
    const prev = lessons[idx - 1];
    const access: AccessReason = canAccessLesson({
      courseStatus: course.status,
      courseId: course.id,
      minPlan,
      lessonOrder: lesson.order,
      previousLessonCompleted: !prev || completed.has(prev.id),
      subscriptions: subs,
    });
    return { lesson, done: completed.has(lesson.id), access };
  });
  const hasSubscription = !!findCoveringSubscription(subs, course.id, new Date(), minPlan);
  return { course, items, hasSubscription, completedCount: completed.size };
}

/** Все, що потрібно для кабінету дитини (і для огляду в кабінеті батьків). */
export async function getStudentOverview(studentId: string) {
  const progress = await prisma.progress.findMany({
    where: { userId: studentId, completed: true },
    include: { lesson: { select: { xp: true, courseId: true } } },
    orderBy: { completedAt: "desc" },
  });

  const submissions = await prisma.submission.findMany({
    where: { userId: studentId },
    include: {
      homework: { include: { lesson: { include: { course: { select: { slug: true, title: true } } } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { author: { select: { role: true } } } },
    },
    orderBy: [{ dueAt: "desc" }, { submittedAt: "desc" }],
  });
  const homework = submissions.map((s) => ({
    id: s.id,
    status: s.status,
    dueAt: s.dueAt,
    submittedAt: s.submittedAt,
    score: s.score,
    maxScore: s.homework.maxScore,
    teacherComment: s.teacherComment,
    needsTeacher: s.needsTeacher,
    teacherReplied: s.messages[0]?.author.role === "teacher", // останнє повідомлення в листуванні — від викладача
    lessonTitle: s.homework.lesson.title,
    lessonOrder: s.homework.lesson.order,
    courseSlug: s.homework.lesson.course.slug,
    courseTitle: s.homework.lesson.course.title,
  }));

  const subs = await getStudentSubscriptions(studentId);
  const plan = bestLivePlan(subs);

  const xp = progress.reduce((s, p) => s + p.lesson.xp, 0) + homework.reduce((s, h) => s + (h.status !== "pending" ? 50 : 0), 0);
  const level = levelFromXp(xp);
  const activity = [
    ...progress.map((p) => p.completedAt ?? p.updatedAt),
    ...homework.filter((h) => h.submittedAt).map((h) => h.submittedAt!),
  ];
  const streak = streakDays(activity);

  // Поточний курс: де була остання активність, інакше курс із підписки, інакше Python
  const allCourses = await prisma.course.findMany({ orderBy: { sortOrder: "asc" } });
  const lastCourseId = progress[0]?.lesson.courseId ?? subs.find((s) => s.courseId)?.courseId ?? null;
  const currentCourse =
    allCourses.find((c) => c.id === lastCourseId) ?? allCourses.find((c) => c.slug === "python" && c.status === "published") ?? null;

  // Скільки курсів пройдено повністю
  const lessonsPerCourse = await prisma.lesson.findMany({ select: { id: true, courseId: true } });
  const doneIds = new Set(progress.map((p) => p.lessonId));
  const byCourse = new Map<string, string[]>();
  for (const l of lessonsPerCourse) byCourse.set(l.courseId, [...(byCourse.get(l.courseId) ?? []), l.id]);
  const finishedCourses = [...byCourse.values()].filter((ids) => ids.length > 0 && ids.every((id) => doneIds.has(id))).length;

  const badges = computeBadges({
    completedLessons: progress.length,
    submittedHomework: homework.filter((h) => h.status !== "pending").length,
    streak,
    finishedCourses,
  });

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return {
    xp,
    level,
    streak,
    badges,
    badgesEnabled: !!plan && PLANS[plan].badges,
    plan,
    subscriptions: subs,
    homework,
    currentCourse,
    allCourses,
    lessonsCompleted: progress.length,
    lessonsThisWeek: progress.filter((p) => (p.completedAt ?? p.updatedAt).getTime() > weekAgo).length,
  };
}
