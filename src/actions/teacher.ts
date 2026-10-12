"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/db";
import { requireUser } from "@/lib/dal";

export async function reviewHomework(formData: FormData) {
  await requireUser("teacher");
  const id = String(formData.get("homeworkId") ?? "");
  // Читаємо submission лише заради maxScore (клемпінг оцінки)
  const sub = await prisma.submission.findUnique({ where: { id }, include: { homework: { select: { maxScore: true } } } });
  if (!sub) return;
  const score = Math.max(0, Math.min(sub.homework.maxScore, Number(formData.get("score") ?? 0) || 0));
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 2000);
  // Атомарна перевірка: оновлюємо лише здані роботи, що чекають на викладача (Преміум)
  const { count } = await prisma.submission.updateMany({
    where: { id, status: "submitted", needsTeacher: true },
    data: { status: "reviewed", score, teacherComment: comment || null, reviewedAt: new Date() },
  });
  if (count === 0) return;
  revalidatePath("/teacher", "layout");
  revalidatePath("/learn", "layout");
  revalidatePath("/cabinet/student");
}
