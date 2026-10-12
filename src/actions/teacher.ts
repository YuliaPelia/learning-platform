"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/db";
import { requireUser } from "@/lib/dal";
import { ReviewHomeworkSchema } from "@/lib/validation";

export async function reviewHomework(formData: FormData) {
  await requireUser("teacher");
  // Не-UUID id — тихий вихід без звернення до БД
  const parsed = ReviewHomeworkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { homeworkId: id, comment } = parsed.data;
  // Читаємо submission лише заради maxScore (клемпінг оцінки)
  const sub = await prisma.submission.findUnique({ where: { id }, include: { homework: { select: { maxScore: true } } } });
  if (!sub) return;
  const score = Math.max(0, Math.min(sub.homework.maxScore, parsed.data.score));
  // Атомарна перевірка: оновлюємо лише здані роботи, що чекають на викладача (Преміум)
  const { count } = await prisma.submission.updateMany({
    where: { id, status: "submitted", needsTeacher: true },
    data: { status: "reviewed", score, teacherComment: comment, reviewedAt: new Date() },
  });
  if (count === 0) return;
  revalidatePath("/teacher", "layout");
  revalidatePath("/learn", "layout");
  revalidatePath("/cabinet/student");
}
