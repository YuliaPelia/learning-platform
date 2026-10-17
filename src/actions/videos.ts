"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/db";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/dal";
import { normalizeVideoUrl } from "@/lib/lesson-content";
import { removeLessonAndShift } from "@/lib/lesson-order";
import { AdminIdSchema, VideoLessonSchema, firstError, keepValues, type FormState } from "@/lib/validation";

/** Відеоуроки можуть керувати викладач і адмін — інші типи уроків тут не чіпаємо. */
const VIDEO_MANAGERS = ["teacher", "admin"] as const;

/** Додає відеоурок у кінець програми курсу. */
export async function addVideoLesson(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser(...VIDEO_MANAGERS);
  const fail = (error: string): FormState => ({ error, values: keepValues(formData) });

  const parsed = VideoLessonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(firstError(parsed.error));
  const f = parsed.data;
  const url = normalizeVideoUrl(f.videoUrl);
  if (!url) return fail("Вкажіть посилання на відео: YouTube, Vimeo або https-адресу файлу .mp4/.webm");
  const content: Prisma.InputJsonValue = { url, markdown: f.markdown };

  const course = await prisma.course.findUnique({ where: { id: f.courseId }, select: { id: true } });
  if (!course) return fail("Курс не знайдено");

  await prisma.$transaction(async (tx) => {
    const last = await tx.lesson.aggregate({ where: { courseId: course.id }, _max: { order: true } });
    await tx.lesson.create({
      data: { courseId: course.id, order: (last._max.order ?? 0) + 1, type: "video", title: f.title, summary: f.summary, xp: f.xp, content },
    });
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Видаляє відеоурок разом із прогресом, домашкою й відповідями учнів (про це попереджає сторінка). */
export async function deleteVideoLesson(formData: FormData) {
  await requireUser(...VIDEO_MANAGERS);
  const id = AdminIdSchema.safeParse(formData.get("lessonId"));
  if (!id.success) return;
  const lesson = await prisma.lesson.findUnique({ where: { id: id.data } });
  // Чужі типи уроків (текст, тест) цією дією не видаляються
  if (!lesson || lesson.type !== "video") return;
  await prisma.$transaction((tx) => removeLessonAndShift(tx, lesson));
  revalidatePath("/", "layout");
}
