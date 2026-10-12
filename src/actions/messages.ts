"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/db";
import { requireUser } from "@/lib/dal";
import { SendMessageSchema } from "@/lib/validation";

/**
 * Повідомлення в гілці домашки. Писати можуть лише учень, якому належить домашка
 * (і лише якщо її перевіряє викладач — тариф Преміум), та викладач.
 */
export async function sendMessage(formData: FormData) {
  const user = await requireUser("student", "teacher");
  const parsed = SendMessageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { submissionId, body } = parsed.data;

  const sub = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { id: true, userId: true, needsTeacher: true },
  });
  if (!sub) return;
  // Тред існує лише для робіт, які перевіряє викладач; учень бачить лише свій тред
  if (!sub.needsTeacher) return;
  if (user.role === "student" && sub.userId !== user.id) return;

  await prisma.message.create({ data: { submissionId: sub.id, authorId: user.id, body } });
  revalidatePath("/teacher", "layout");
  revalidatePath("/learn", "layout");
  revalidatePath("/cabinet/student");
}
