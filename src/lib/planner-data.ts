import "server-only";
import { prisma } from "@/db";

export const DEFAULT_PROFILE = { minutesPerDay: 45, studyDays: [0, 1, 2, 3, 4], busyNote: "", goal: "" };

/** Задачі, розклад і навантаження учня. Відкриті задачі — першими, потім 10 останніх виконаних. */
export async function getPlanner(studentId: string) {
  const [open, done, slots, profile] = await Promise.all([
    prisma.studyTask.findMany({ where: { studentId, done: false }, orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }] }),
    prisma.studyTask.findMany({ where: { studentId, done: true }, orderBy: { doneAt: "desc" }, take: 10 }),
    prisma.scheduleSlot.findMany({ where: { studentId }, orderBy: [{ weekday: "asc" }, { startMinute: "asc" }] }),
    prisma.studyProfile.findUnique({ where: { studentId } }),
  ]);
  return { tasks: [...open, ...done], slots, profile: profile ?? DEFAULT_PROFILE };
}

/** Прогрес по кожному курсу, який учень почав (або поточному): пройдено / усього і наступний урок. */
export async function getCourseProgress(studentId: string, currentCourseId: string | null) {
  const touched = await prisma.progress.findMany({
    where: { userId: studentId, completed: true },
    select: { lessonId: true, lesson: { select: { courseId: true } } },
  });
  const courseIds = new Set(touched.map((t) => t.lesson.courseId));
  if (currentCourseId) courseIds.add(currentCourseId);
  if (!courseIds.size) return [];
  const doneIds = new Set(touched.map((t) => t.lessonId));
  const courses = await prisma.course.findMany({
    where: { id: { in: [...courseIds] } },
    orderBy: { sortOrder: "asc" },
    select: { id: true, slug: true, title: true, lessons: { orderBy: { order: "asc" }, select: { id: true, order: true, title: true } } },
  });
  return courses.map((c) => {
    const next = c.lessons.find((l) => !doneIds.has(l.id)) ?? null;
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      done: c.lessons.filter((l) => doneIds.has(l.id)).length,
      total: c.lessons.length,
      next: next ? { order: next.order, title: next.title } : null,
    };
  });
}
