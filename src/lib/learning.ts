import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { canAccessLesson, findCoveringSubscription, isSubscriptionLive, type AccessReason } from "./access";
import { computeBadges, levelFromXp, streakDays } from "./gamification";
import { PLANS, type PlanId } from "./plans";

/** Усі підписки дитини. */
export async function getStudentSubscriptions(studentId: string) {
  return db.select().from(schema.subscriptions).where(eq(schema.subscriptions.studentId, studentId)).orderBy(desc(schema.subscriptions.createdAt));
}

/** Найкращий діючий тариф дитини (для бейджів/викладача): premium > standard > basic. */
export function bestLivePlan(subs: Awaited<ReturnType<typeof getStudentSubscriptions>>): PlanId | null {
  const live = subs.filter((s) => isSubscriptionLive(s));
  for (const p of ["premium", "standard", "basic"] as const) if (live.some((s) => s.plan === p)) return p;
  return null;
}

export async function getCourseBySlug(slug: string) {
  const [course] = await db.select().from(schema.courses).where(eq(schema.courses.slug, slug));
  if (!course) return null;
  const lessons = await db.select().from(schema.lessons).where(eq(schema.lessons.courseId, course.id)).orderBy(asc(schema.lessons.order));
  return { course, lessons };
}

export async function getCompletedLessonIds(studentId: string, lessonIds: string[]) {
  if (!lessonIds.length) return new Set<string>();
  const rows = await db
    .select({ lessonId: schema.lessonProgress.lessonId })
    .from(schema.lessonProgress)
    .where(and(eq(schema.lessonProgress.studentId, studentId), inArray(schema.lessonProgress.lessonId, lessonIds)));
  return new Set(rows.map((r) => r.lessonId));
}

/** Стан кожного уроку курсу для конкретної дитини. */
export async function getCourseState(slug: string, studentId: string | null) {
  const data = await getCourseBySlug(slug);
  if (!data) return null;
  const { course, lessons } = data;
  const completed = studentId ? await getCompletedLessonIds(studentId, lessons.map((l) => l.id)) : new Set<string>();
  const subs = studentId ? await getStudentSubscriptions(studentId) : [];
  const items = lessons.map((lesson, idx) => {
    const prev = lessons[idx - 1];
    const access: AccessReason = canAccessLesson({
      courseStatus: course.status,
      courseId: course.id,
      lessonOrder: lesson.order,
      previousLessonCompleted: !prev || completed.has(prev.id),
      subscriptions: subs,
    });
    return { lesson, done: completed.has(lesson.id), access };
  });
  const hasSubscription = !!findCoveringSubscription(subs, course.id);
  return { course, items, hasSubscription, completedCount: completed.size };
}

/** Все, що потрібно для кабінету дитини. */
export async function getStudentOverview(studentId: string) {
  const progress = await db
    .select({
      lessonId: schema.lessonProgress.lessonId,
      completedAt: schema.lessonProgress.completedAt,
      xp: schema.lessons.xp,
      courseId: schema.lessons.courseId,
    })
    .from(schema.lessonProgress)
    .innerJoin(schema.lessons, eq(schema.lessons.id, schema.lessonProgress.lessonId))
    .where(eq(schema.lessonProgress.studentId, studentId))
    .orderBy(desc(schema.lessonProgress.completedAt));

  const hw = await db
    .select({
      id: schema.homework.id,
      status: schema.homework.status,
      dueAt: schema.homework.dueAt,
      submittedAt: schema.homework.submittedAt,
      score: schema.homework.score,
      teacherComment: schema.homework.teacherComment,
      needsTeacher: schema.homework.needsTeacher,
      lessonTitle: schema.lessons.title,
      lessonOrder: schema.lessons.order,
      courseSlug: schema.courses.slug,
      courseTitle: schema.courses.title,
    })
    .from(schema.homework)
    .innerJoin(schema.lessons, eq(schema.lessons.id, schema.homework.lessonId))
    .innerJoin(schema.courses, eq(schema.courses.id, schema.lessons.courseId))
    .where(eq(schema.homework.studentId, studentId))
    .orderBy(desc(schema.homework.dueAt));

  const subs = await getStudentSubscriptions(studentId);
  const plan = bestLivePlan(subs);

  const xp = progress.reduce((s, p) => s + p.xp, 0) + hw.reduce((s, h) => s + (h.status !== "pending" ? 50 : 0), 0);
  const level = levelFromXp(xp);
  const activity = [...progress.map((p) => p.completedAt), ...hw.filter((h) => h.submittedAt).map((h) => h.submittedAt!)];
  const streak = streakDays(activity);

  // Поточний курс: де була остання активність, інакше курс із підписки, інакше Python
  const allCourses = await db.select().from(schema.courses).orderBy(asc(schema.courses.sortOrder));
  const lastCourseId = progress[0]?.courseId ?? subs.find((s) => s.courseId)?.courseId ?? null;
  const currentCourse =
    allCourses.find((c) => c.id === lastCourseId) ?? allCourses.find((c) => c.slug === "python" && c.status === "published") ?? null;

  // Скільки курсів пройдено повністю
  const lessonsPerCourse = await db.select({ courseId: schema.lessons.courseId, id: schema.lessons.id }).from(schema.lessons);
  const doneIds = new Set(progress.map((p) => p.lessonId));
  const byCourse = new Map<string, string[]>();
  for (const l of lessonsPerCourse) byCourse.set(l.courseId, [...(byCourse.get(l.courseId) ?? []), l.id]);
  const finishedCourses = [...byCourse.values()].filter((ids) => ids.length > 0 && ids.every((id) => doneIds.has(id))).length;

  const badges = computeBadges({
    completedLessons: progress.length,
    submittedHomework: hw.filter((h) => h.status !== "pending").length,
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
    homework: hw,
    currentCourse,
    allCourses,
    lessonsCompleted: progress.length,
    lessonsThisWeek: progress.filter((p) => p.completedAt.getTime() > weekAgo).length,
  };
}
