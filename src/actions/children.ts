"use server";

import bcrypt from "bcryptjs";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/dal";
import { LEGAL_VERSION } from "@/lib/plans";
import { requestMeta } from "@/lib/request";
import { ChildSchema, firstError, keepValues, type FormState } from "@/lib/validation";
import { getWfpConfig, removeRegularPayment } from "@/lib/wayforpay";

export async function addChild(_prev: FormState, formData: FormData): Promise<FormState> {
  const parent = await requireUser("parent");
  const parsed = ChildSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error), values: keepValues(formData) };
  const { name, birthYear, login, password } = parsed.data;

  const [taken] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.login, login));
  if (taken) return { error: "Такий логін уже зайнятий — спробуйте інший", values: keepValues(formData) };

  const [child] = await db
    .insert(schema.users)
    .values({ role: "student", login, name, birthYear, parentId: parent.id, passwordHash: await bcrypt.hash(password, 10) })
    .returning();

  const meta = await requestMeta();
  await db
    .insert(schema.consents)
    .values({ userId: parent.id, type: "child_data", documentVersion: LEGAL_VERSION, subjectId: child.id, ...meta });

  revalidatePath("/cabinet/parent");
  return { ok: true };
}

/**
 * Видалення профілю дитини на вимогу батьків (право на видалення персональних даних).
 * Прогрес і домашки видаляються каскадно; платежі залишаються (бухгалтерський облік),
 * але більше не пов'язані з дитиною. Діючі регулярні списання скасовуються.
 */
export async function deleteChild(formData: FormData) {
  const parent = await requireUser("parent");
  const childId = String(formData.get("childId") ?? "");
  const [child] = await db
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.id, childId), eq(schema.users.parentId, parent.id)));
  if (!child) return;

  const subs = await db
    .select()
    .from(schema.subscriptions)
    .where(and(eq(schema.subscriptions.studentId, child.id), inArray(schema.subscriptions.status, ["active", "past_due"])));
  const cfg = getWfpConfig();
  for (const s of subs) {
    if (cfg) await removeRegularPayment(cfg, s.orderReference).catch(() => false);
    await db.update(schema.subscriptions).set({ status: "canceled", canceledAt: new Date() }).where(eq(schema.subscriptions.id, s.id));
  }
  await db.delete(schema.users).where(eq(schema.users.id, child.id));
  revalidatePath("/cabinet/parent");
}
