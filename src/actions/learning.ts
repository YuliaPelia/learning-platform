"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/db";
import { canAccessLesson } from "@/lib/access";
import { requireUser } from "@/lib/dal";
import { gradeQuiz, parseLessonContent } from "@/lib/lesson-content";
import { bestLivePlan, getStudentSubscriptions } from "@/lib/learning";
import { appUrl, sendEmail } from "@/lib/mailer";
import { PLANS } from "@/lib/plans";

const DAY = 24 * 60 * 60 * 1000;

/** Урок з курсом і домашкою + повторна перевірка доступу на сервері (кнопку в браузері можна підробити). */
async function loadAccessibleLesson(studentId: string, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { course: { include: { minPlan: true } }, homework: true },
  });
  if (!lesson) return null;
  const { course } = lesson;

  let prevDone = true;
  if (lesson.order > 1) {
    const prev = await prisma.lesson.findUnique({
      where: { courseId_order: { courseId: course.id, order: lesson.order - 1 } },
      select: { id: true },
    });
    prevDone = prev
      ? !!(await prisma.progress.findFirst({ where: { userId: studentId, lessonId: prev.id, completed: true } }))
      : true;
  }
  const subs = await getStudentSubscriptions(studentId);
  const access = canAccessLesson({
    courseStatus: course.status,
    courseId: course.id,
    minPlan: course.minPlan.code,
    lessonOrder: lesson.order,
    previousLessonCompleted: prevDone,
    subscriptions: subs,
  });
  return access === "ok" ? { lesson, course, subs } : null;
}

/** Записує проходження уроку, видає домашку (якщо є) і веде далі. */
async function finishLesson(
  studentId: string,
  loaded: NonNullable<Awaited<ReturnType<typeof loadAccessibleLesson>>>,
  score: number | null,
) {
  const { lesson, course, subs } = loaded;
  const now = new Date();
  await prisma.progress.upsert({
    where: { userId_lessonId: { userId: studentId, lessonId: lesson.id } },
    create: { userId: studentId, lessonId: lesson.id, completed: true, completedAt: now, score },
    update: { completed: true, completedAt: now, score },
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

  revalidatePath(`/learn/${course.slug}`, "layout");
  revalidatePath("/cabinet/student");

  // Є домашка — лишаємо дитину на уроці, щоб вона одразу побачила завдання
  if (lesson.homework) redirect(`/learn/${course.slug}/${lesson.order}#homework`);

  const next = await prisma.lesson.findUnique({
    where: { courseId_order: { courseId: course.id, order: lesson.order + 1 } },
    select: { order: true },
  });
  redirect(next ? `/learn/${course.slug}/${next.order}` : `/courses/${course.slug}?finished=1`);
}

/** Дитина завершила текстовий або відеоурок. */
export async function completeLesson(formData: FormData) {
  const student = await requireUser("student");
  const loaded = await loadAccessibleLesson(student.id, String(formData.get("lessonId") ?? ""));
  if (!loaded || loaded.lesson.type === "quiz") return; // тест зараховується лише через submitQuiz
  await finishLesson(student.id, loaded, null);
}

/** Дитина відповіла на тест: рахуємо бали на сервері (правильні відповіді в браузер не потрапляють). */
export async function submitQuiz(formData: FormData) {
  const student = await requireUser("student");
  const loaded = await loadAccessibleLesson(student.id, String(formData.get("lessonId") ?? ""));
  if (!loaded || loaded.lesson.type !== "quiz") return;
  const { questions } = parseLessonContent(loaded.lesson.type, loaded.lesson.content);
  const answers = questions.map((_, i) => {
    const v = formData.get(`q${i}`);
    return v === null ? -1 : Number(v);
  });
  const result = gradeQuiz(questions, answers);
  const score = result.total ? Math.round((result.correct / result.total) * 100) : 100;

  if (!result.passed) {
    await prisma.progress.upsert({
      where: { userId_lessonId: { userId: student.id, lessonId: loaded.lesson.id } },
      create: { userId: student.id, lessonId: loaded.lesson.id, completed: false, score },
      update: { score }, // уже пройдений тест не "розпроходиться" через невдалу повторну спробу
    });
    redirect(`/learn/${loaded.course.slug}/${loaded.lesson.order}?quiz=${result.correct}-${result.total}`);
  }
  await finishLesson(student.id, loaded, score);
}

export async function submitHomework(formData: FormData) {
  const student = await requireUser("student");
  const submissionId = String(formData.get("homeworkId") ?? "");
  const answer = String(formData.get("answer") ?? "").trim().slice(0, 10000);
  if (!answer) return;
  const sub = await prisma.submission.findFirst({ where: { id: submissionId, userId: student.id } });
  if (!sub || sub.status === "reviewed") return;

  // Без викладача (Простий/Середній) домашка зараховується одразу
  const now = new Date();
  await prisma.submission.update({
    where: { id: sub.id },
    data: {
      answer,
      submittedAt: now,
      status: sub.needsTeacher ? "submitted" : "reviewed",
      reviewedAt: sub.needsTeacher ? null : now,
    },
  });
  revalidatePath("/cabinet/student");
  revalidatePath("/learn", "layout");
}

/** "Попроси батьків відкрити курс" — лист батькам з посиланням на тарифи. */
export async function requestUnlock(formData: FormData) {
  const student = await requireUser("student");
  const courseTitle = String(formData.get("courseTitle") ?? "курс").slice(0, 80);
  if (!student.parentId) return;
  const parent = await prisma.user.findUnique({ where: { id: student.parentId }, select: { email: true } });
  await sendEmail(
    parent?.email,
    `${student.name} просить відкрити курс «${courseTitle}»`,
    `Вітаємо!\n\n${student.name} пройшов(-ла) безкоштовні уроки курсу «${courseTitle}» і хоче продовжити.\nОбрати тариф: ${appUrl("/pricing")}\n\nКоманда ITCodeCraft`,
  );
  const back = String(formData.get("back") ?? "");
  const safeBack = back.startsWith("/") && !back.startsWith("//") ? back.split("?")[0] : "/cabinet/student";
  redirect(`${safeBack}?asked=1`);
}
