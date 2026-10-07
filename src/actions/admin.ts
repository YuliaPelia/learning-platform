"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/db";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/dal";
import { normalizeVideoUrl } from "@/lib/lesson-content";
import { CourseSchema, LessonSchema, QuizQuestionsSchema, firstError, keepValues, type FormState } from "@/lib/validation";

/** Курси й уроки показуються на багатьох сторінках (каталог, курс, урок, кабінети) — оновлюємо все. */
function revalidateContent() {
  revalidatePath("/", "layout");
}

/** Створює курс або оновлює наявний (якщо у формі є courseId). */
export async function saveCourse(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser("admin");
  const parsed = CourseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error), values: keepValues(formData) };
  const { minPlan, ...fields } = parsed.data;
  const courseId = String(formData.get("courseId") ?? "");

  const taken = await prisma.course.findUnique({ where: { slug: fields.slug }, select: { id: true } });
  if (taken && taken.id !== courseId) return { error: "Курс з такою адресою вже існує", values: keepValues(formData) };

  const plan = await prisma.plan.findUnique({ where: { code: minPlan }, select: { id: true } });
  if (!plan) return { error: "Такого тарифу немає в базі", values: keepValues(formData) };
  const data = { ...fields, description: fields.description || null, minPlanId: plan.id };

  if (courseId) {
    const existing = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
    if (!existing) return { error: "Курс не знайдено — можливо, його вже видалили", values: keepValues(formData) };
    await prisma.course.update({ where: { id: courseId }, data });
    revalidateContent();
    return { ok: true, values: keepValues(formData) };
  }

  const course = await prisma.course.create({ data });
  revalidateContent();
  redirect(`/admin/courses/${course.id}`);
}

/**
 * Видаляє курс разом з уроками, домашками та прогресом учнів.
 * Курс, на який є підписки, видалити не можна — це ламає облік оплат; його можна сховати статусом «Скоро».
 */
export async function deleteCourse(formData: FormData) {
  await requireUser("admin");
  const courseId = String(formData.get("courseId") ?? "");
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, _count: { select: { subscriptions: true } } },
  });
  if (!course) redirect("/admin");
  if (course._count.subscriptions > 0) redirect(`/admin/courses/${course.id}?error=subscriptions`);
  await prisma.course.delete({ where: { id: course.id } });
  revalidateContent();
  redirect("/admin?deleted=1");
}

/** Створює урок (у кінці програми) або оновлює наявний, разом із домашкою. */
export async function saveLesson(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser("admin");
  const fail = (error: string): FormState => ({ error, values: keepValues(formData) });

  const parsed = LessonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(firstError(parsed.error));
  const f = parsed.data;
  const courseId = String(formData.get("courseId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  const hasHomework = formData.get("hasHomework") === "on";

  let content: Prisma.InputJsonValue;
  if (f.type === "video") {
    const url = normalizeVideoUrl(f.videoUrl);
    if (!url) return fail("Вкажіть посилання на відео: YouTube, Vimeo або https-адресу файлу .mp4/.webm");
    content = { url, markdown: f.markdown };
  } else if (f.type === "quiz") {
    let raw: unknown;
    try {
      raw = JSON.parse(String(formData.get("questions") ?? "[]"));
    } catch {
      return fail("Не вдалося прочитати питання тесту");
    }
    const questions = QuizQuestionsSchema.safeParse(raw);
    if (!questions.success) return fail(firstError(questions.error));
    content = { markdown: f.markdown, questions: questions.data };
  } else {
    if (!f.markdown.trim()) return fail("Додайте текст уроку");
    content = { markdown: f.markdown };
  }
  if (hasHomework && !f.homeworkTask) return fail("Опишіть домашнє завдання або зніміть позначку «Є домашнє завдання»");

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
  if (!course) return fail("Курс не знайдено");
  const data = { type: f.type, title: f.title, summary: f.summary, xp: f.xp, content };
  const homework = { task: f.homeworkTask, maxScore: f.maxScore, dueDays: f.dueDays };

  await prisma.$transaction(async (tx) => {
    let id = lessonId;
    if (id) {
      await tx.lesson.update({ where: { id, courseId: course.id }, data });
    } else {
      const last = await tx.lesson.aggregate({ where: { courseId: course.id }, _max: { order: true } });
      id = (await tx.lesson.create({ data: { ...data, courseId: course.id, order: (last._max.order ?? 0) + 1 } })).id;
    }
    if (hasHomework) {
      await tx.homework.upsert({ where: { lessonId: id }, update: homework, create: { ...homework, lessonId: id } });
    } else {
      // Разом із домашкою видаляються здані учнями відповіді (про це попереджає форма)
      await tx.homework.deleteMany({ where: { lessonId: id } });
    }
  });

  revalidateContent();
  redirect(`/admin/courses/${course.id}?saved=1`);
}

/** Видаляє урок і зсуває наступні, щоб номери уроків ішли без пропусків (від цього залежить порядок відкриття). */
export async function deleteLesson(formData: FormData) {
  await requireUser("admin");
  const lesson = await prisma.lesson.findUnique({ where: { id: String(formData.get("lessonId") ?? "") } });
  if (!lesson) return;
  await prisma.$transaction(async (tx) => {
    await tx.lesson.delete({ where: { id: lesson.id } });
    const after = await tx.lesson.findMany({
      where: { courseId: lesson.courseId, order: { gt: lesson.order } },
      orderBy: { order: "asc" },
      select: { id: true, order: true },
    });
    // По одному й за зростанням — інакше спрацює унікальність (course_id, order)
    for (const l of after) await tx.lesson.update({ where: { id: l.id }, data: { order: l.order - 1 } });
  });
  revalidateContent();
  redirect(`/admin/courses/${lesson.courseId}`);
}

/** Міняє урок місцями із сусіднім (direction: up | down). */
export async function moveLesson(formData: FormData) {
  await requireUser("admin");
  const lesson = await prisma.lesson.findUnique({ where: { id: String(formData.get("lessonId") ?? "") } });
  if (!lesson) return;
  const targetOrder = lesson.order + (formData.get("direction") === "up" ? -1 : 1);
  const other = await prisma.lesson.findUnique({ where: { courseId_order: { courseId: lesson.courseId, order: targetOrder } } });
  if (!other) return;
  // order = 0 — тимчасове місце, щоб не порушити унікальність (course_id, order)
  await prisma.$transaction([
    prisma.lesson.update({ where: { id: lesson.id }, data: { order: 0 } }),
    prisma.lesson.update({ where: { id: other.id }, data: { order: lesson.order } }),
    prisma.lesson.update({ where: { id: lesson.id }, data: { order: other.order } }),
  ]);
  revalidateContent();
}
