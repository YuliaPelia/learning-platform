"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/db";
import { canSubmitHomework } from "@/lib/access";
import { requireUser } from "@/lib/dal";
import { gradeQuiz, parseLessonContent } from "@/lib/lesson-content";
import { loadAccessibleLesson, recordLessonCompletion, recordQuizFailure, type LoadedLesson } from "@/lib/lesson-progress";
import { appUrl, sendEmail } from "@/lib/mailer";
import { LessonIdSchema, SubmitHomeworkSchema } from "@/lib/validation";

/** Записує проходження уроку, видає домашку (якщо є) і веде далі. */
async function finishLesson(studentId: string, loaded: LoadedLesson, score: number | null) {
  const { lesson, course } = loaded;
  await recordLessonCompletion(studentId, loaded, score);

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
  const lessonId = LessonIdSchema.safeParse(formData.get("lessonId"));
  if (!lessonId.success) return;
  const loaded = await loadAccessibleLesson(student.id, lessonId.data);
  if (!loaded || loaded.lesson.type === "quiz") return; // тест зараховується лише через submitQuiz
  await finishLesson(student.id, loaded, null);
}

/** Дитина відповіла на тест: рахуємо бали на сервері (правильні відповіді в браузер не потрапляють). */
export async function submitQuiz(formData: FormData) {
  const student = await requireUser("student");
  const lessonId = LessonIdSchema.safeParse(formData.get("lessonId"));
  if (!lessonId.success) return;
  const loaded = await loadAccessibleLesson(student.id, lessonId.data);
  if (!loaded || loaded.lesson.type !== "quiz") return;
  const { questions } = parseLessonContent(loaded.lesson.type, loaded.lesson.content);
  const answers = questions.map((_, i) => {
    const v = formData.get(`q${i}`);
    const n = v === null ? -1 : Number(v);
    return Number.isInteger(n) ? n : -1;
  });
  const result = gradeQuiz(questions, answers);
  const score = result.total ? Math.round((result.correct / result.total) * 100) : 100;

  if (!result.passed) {
    await recordQuizFailure(student.id, loaded.lesson.id, score);
    redirect(`/learn/${loaded.course.slug}/${loaded.lesson.order}?quiz=${result.correct}-${result.total}`);
  }
  await finishLesson(student.id, loaded, score);
}

/** Здача домашки. Перездача дозволена до перевірки; після `reviewed` — ні. */
export async function submitHomework(formData: FormData) {
  const student = await requireUser("student");
  const parsed = SubmitHomeworkSchema.safeParse({
    homeworkId: formData.get("homeworkId"),
    answer: formData.get("answer"),
  });
  if (!parsed.success) return;
  // Перевірка власника: шукаємо роботу лише серед робіт цього учня
  const sub = await prisma.submission.findFirst({ where: { id: parsed.data.homeworkId, userId: student.id } });
  if (!sub || !canSubmitHomework(sub.status)) return;

  // Без викладача (Простий/Середній) домашка зараховується одразу
  const now = new Date();
  // Атомарно: якщо викладач встиг перевірити між читанням і записом, нічого не змінюємо
  const { count } = await prisma.submission.updateMany({
    where: { id: sub.id, userId: student.id, status: { not: "reviewed" } },
    data: {
      answer: parsed.data.answer,
      submittedAt: now,
      status: sub.needsTeacher ? "submitted" : "reviewed",
      reviewedAt: sub.needsTeacher ? null : now,
    },
  });
  if (!count) return;
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
