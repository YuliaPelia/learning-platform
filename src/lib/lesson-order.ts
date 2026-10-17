import type { Prisma } from "@/generated/prisma/client";

/**
 * Видаляє урок і зсуває наступні, щоб номери уроків ішли без пропусків
 * (від цього залежить порядок відкриття). Викликається всередині транзакції.
 */
export async function removeLessonAndShift(tx: Prisma.TransactionClient, lesson: { id: string; courseId: string; order: number }) {
  await tx.lesson.delete({ where: { id: lesson.id } });
  const after = await tx.lesson.findMany({
    where: { courseId: lesson.courseId, order: { gt: lesson.order } },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });
  // По одному й за зростанням — інакше спрацює унікальність (course_id, order)
  for (const l of after) await tx.lesson.update({ where: { id: l.id }, data: { order: l.order - 1 } });
}
