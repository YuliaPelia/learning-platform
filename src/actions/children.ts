"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/db";
import { requireUser } from "@/lib/dal";
import { hashPassword } from "@/lib/password";
import { LEGAL_VERSION } from "@/lib/plans";
import { requestMeta } from "@/lib/request";
import { ChildSchema, firstError, keepValues, type FormState } from "@/lib/validation";
import { getWfpConfig, removeRegularPayment } from "@/lib/wayforpay";

export async function addChild(_prev: FormState, formData: FormData): Promise<FormState> {
  const parent = await requireUser("parent");
  const parsed = ChildSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error), values: keepValues(formData) };
  const { name, birthYear, login, password } = parsed.data;

  const taken = await prisma.user.findUnique({ where: { login }, select: { id: true } });
  if (taken) return { error: "Такий логін уже зайнятий — спробуйте інший", values: keepValues(formData) };

  const meta = await requestMeta();
  // Профіль дитини і згода батьків на обробку її даних — одна транзакція
  await prisma.$transaction(async (tx) => {
    const child = await tx.user.create({
      data: { role: "student", login, name, birthYear, parentId: parent.id, passwordHash: await hashPassword(password) },
    });
    await tx.consent.create({
      data: { parentId: parent.id, childId: child.id, type: "child_data", documentVersion: LEGAL_VERSION, ...meta },
    });
  });

  revalidatePath("/cabinet/parent");
  return { ok: true };
}

/**
 * Видалення профілю дитини на вимогу батьків (право на видалення персональних даних).
 * Прогрес і домашки видаляються каскадно; платежі й згоди залишаються (облік і доказ),
 * але більше не пов'язані з дитиною. Діючі регулярні списання скасовуються.
 */
export async function deleteChild(formData: FormData) {
  const parent = await requireUser("parent");
  const childId = String(formData.get("childId") ?? "");
  const child = await prisma.user.findFirst({ where: { id: childId, parentId: parent.id } });
  if (!child) return;

  const subs = await prisma.subscription.findMany({
    where: { studentId: child.id, status: { in: ["active", "past_due"] } },
  });
  const cfg = getWfpConfig();
  for (const s of subs) {
    if (cfg) await removeRegularPayment(cfg, s.orderReference).catch(() => false);
    await prisma.subscription.update({ where: { id: s.id }, data: { status: "canceled", canceledAt: new Date() } });
  }
  await prisma.user.delete({ where: { id: child.id } });
  revalidatePath("/cabinet/parent");
}
