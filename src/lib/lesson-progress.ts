import { prisma } from "@/db";
import { canAccessLesson } from "@/lib/access";
import { bestLivePlan, getStudentSubscriptions } from "@/lib/learning";
import { PLANS } from "@/lib/plans";

const DAY = 24 * 60 * 60 * 1000;

/** Урок з курсом і домашкою + повторна перевірка доступу на сервері (кнопку в браузері можна підробити). */
export async function loadAccessibleLesson(studentId: string, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { course: { include: { minPlan: true } }, homework: true },
  });
  if (!lesson) return null;
  const { course } = lesson;

  // Попередній — найближчий урок з меншим номером (навіть якщо адмін видалив урок і в нумерації є пропуск)
  let prevDone = true;
  let prevHomeworkPending = false;
  const prev = await prisma.lesson.findFirst({
    where: { courseId: course.id, order: { lt: lesson.order } },
    orderBy: { order: "desc" },
    select: { id: true, homework: { select: { id: true } } },
  });
  if (prev) {
    prevDone = !!(await prisma.progress.findFirst({ where: { userId: studentId, lessonId: prev.id, completed: true } }));
    prevHomeworkPending =
      !!prev.homework && !!(await prisma.submission.findFirst({ where: { homeworkId: prev.homework.id, userId: studentId, status: "pending" }, select: { id: true } }));
  }
  const subs = await getStudentSubscriptions(studentId);
  const access = canAccessLesson({
    courseStatus: course.status,
    courseId: course.id,
    minPlan: course.minPlan.code,
    lessonOrder: lesson.order,
    previousLessonCompleted: prevDone,
    previousHomeworkPending: prevHomeworkPending,
    subscriptions: subs,
  });
  return access === "ok" ? { lesson, course, subs } : null;
}

export type LoadedLesson = NonNullable<Awaited<ReturnType<typeof loadAccessibleLesson>>>;

/** Записує проходження уроку й видає домашку (якщо є). Ідемпотентно. */
export async function recordLessonCompletion(studentId: string, loaded: LoadedLesson, score: number | null) {
  const { lesson, subs } = loaded;
  const now = new Date();
  // Ідемпотентно: уже пройдений урок не оновлюємо (інакше повтор зсуває дату/бал і серію днів)
  await prisma.progress.upsert({
    where: { userId_lessonId: { userId: studentId, lessonId: lesson.id } },
    create: { userId: studentId, lessonId: lesson.id, completed: true, completedAt: now, score },
    update: {},
  });
  await prisma.progress.updateMany({
    where: { userId: studentId, lessonId: lesson.id, completed: false },
    data: { completed: true, completedAt: now, score },
  });

  if (lesson.homework) {
    const plan = bestLivePlan(subs);
    // Повторне проходження уроку не змінює вже видану домашку
    await prisma.submission.upsert({
      where: { homeworkId_userId: { homeworkId: lesson.homework.id, userId: studentId } },
      create: {
        homeworkId: lesson.homework.id,
        userId: studentId,
        status: "pending",
        dueAt: lesson.homework.deadline ?? new Date(now.getTime() + lesson.homework.dueDays * DAY),
        needsTeacher: !!plan && PLANS[plan].teacher,
      },
      update: {},
    });
  }
}

/** Невдала спроба тесту: зберігаємо бал, але вже пройдений тест не «розпроходиться». */
export async function recordQuizFailure(studentId: string, lessonId: string, score: number) {
  await prisma.progress.upsert({
    where: { userId_lessonId: { userId: studentId, lessonId } },
    create: { userId: studentId, lessonId, completed: false, score },
    update: {},
  });
  await prisma.progress.updateMany({ where: { userId: studentId, lessonId, completed: false }, data: { score } });
}
