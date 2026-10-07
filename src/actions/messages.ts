"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/db";
import { requireUser } from "@/lib/dal";

/**
 * Повідомлення в гілці домашки. Писати можуть лише учень, якому належить домашка
 * (і лише якщо її перевіряє викладач — тариф Преміум), та викладач.
 */
export async function sendMessage(formData: FormData) {
  const user = await requireUser("student", "teacher");
  const submissionId = String(formData.get("submissionId") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, 2000);
  if (!body) return;

  const sub = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { id: true, userId: true, needsTeacher: true },
  });
  if (!sub) return;
  if (user.role === "student" && (sub.userId !== user.id || !sub.needsTeacher)) return;

  await prisma.message.create({ data: { submissionId: sub.id, authorId: user.id, body } });
  revalidatePath("/teacher", "layout");
  revalidatePath("/learn", "layout");
  revalidatePath("/cabinet/student");
}
