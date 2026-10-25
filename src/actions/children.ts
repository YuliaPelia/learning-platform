"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/db";
import { deleteStudentProfile } from "@/lib/account";
import { requireUser } from "@/lib/dal";
import { hashPassword } from "@/lib/password";
import { LEGAL_VERSION } from "@/lib/plans";
import { requestMeta } from "@/lib/request";
import { ChildIdSchema, ChildSchema, firstError, keepValues, type FormState } from "@/lib/validation";

export async function addChild(_prev: FormState, formData: FormData): Promise<FormState> {
  const parent = await requireUser("parent");
  const parsed = ChildSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error), values: keepValues(formData) };
  const { name, birthYear, login, password, email } = parsed.data;

  const taken = await prisma.user.findUnique({ where: { login }, select: { id: true } });
  if (taken) return { error: "Такий логін уже зайнятий — спробуйте інший", values: keepValues(formData) };
  if (email) {
    const takenEmail = await prisma.user.findFirst({ where: { OR: [{ email }, { login: email }] }, select: { id: true } });
    if (takenEmail) return { error: "Акаунт з таким email уже існує", values: keepValues(formData) };
  }

  const meta = await requestMeta();
  // Профіль дитини і згода батьків на обробку її даних — одна транзакція
  await prisma.$transaction(async (tx) => {
    const child = await tx.user.create({
      data: { role: "student", login, name, birthYear, email: email ?? null, parentId: parent.id, passwordHash: await hashPassword(password) },
    });
    await tx.consent.create({
      data: { parentId: parent.id, childId: child.id, type: "child_data", documentVersion: LEGAL_VERSION, ...meta },
    });
  });

  revalidatePath("/cabinet/parent");
  return { ok: true, values: email ? { email } : undefined };
}

/**
 * Видалення профілю дитини на вимогу батьків (право на видалення персональних даних).
 * Прогрес і домашки видаляються каскадно; платежі й згоди залишаються (облік і доказ),
 * але більше не пов'язані з дитиною. Діючі регулярні списання скасовуються.
 */
export async function deleteChild(_prev: FormState, formData: FormData): Promise<FormState> {
  const parent = await requireUser("parent");
  // Не-UUID відсікаємо до звернення до БД
  const parsedId = ChildIdSchema.safeParse(formData.get("childId"));
  if (!parsedId.success) return {};
  const childId = parsedId.data;
  const child = await prisma.user.findFirst({ where: { id: childId, parentId: parent.id } });
  if (!child) return {};

  const res = await deleteStudentProfile(child.id);
  if (!res.ok) return { error: res.error };
  revalidatePath("/cabinet/parent");
  return { ok: true };
}
