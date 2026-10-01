"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/dal";

export async function reviewHomework(formData: FormData) {
  await requireUser("teacher", "admin");
  const id = String(formData.get("homeworkId") ?? "");
  const score = Math.max(0, Math.min(10, Number(formData.get("score") ?? 0) || 0));
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 2000);
  await db
    .update(schema.homework)
    .set({ status: "reviewed", score, teacherComment: comment || null, reviewedAt: new Date() })
    .where(eq(schema.homework.id, id));
  revalidatePath("/teacher");
}
