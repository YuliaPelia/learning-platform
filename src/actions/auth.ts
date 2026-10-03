"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/db";
import { homeFor } from "@/lib/dal";
import { hashPassword, verifyPassword } from "@/lib/password";
import { LEGAL_VERSION } from "@/lib/plans";
import { requestMeta } from "@/lib/request";
import { createSession, deleteSession } from "@/lib/session";
import { LoginSchema, RegisterSchema, firstError, keepValues, type FormState } from "@/lib/validation";

/** Безпечне посилання для повернення після входу (лише внутрішні шляхи). */
function safeNext(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : null;
}

export async function registerParent(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = RegisterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error), values: keepValues(formData) };
  const { name, email, password } = parsed.data;

  const exists = await prisma.user.findFirst({ where: { OR: [{ login: email }, { email }] }, select: { id: true } });
  if (exists) return { error: "Акаунт з таким email уже існує. Спробуйте увійти.", values: keepValues(formData) };

  const meta = await requestMeta();
  // Акаунт і згода — одна транзакція: або записано обидва, або нічого
  const user = await prisma.user.create({
    data: {
      role: "parent",
      login: email,
      email,
      name,
      passwordHash: await hashPassword(password),
      consents: { create: { type: "age_confirm", documentVersion: LEGAL_VERSION, ...meta } },
    },
  });

  await createSession(user.id, "parent");
  redirect(safeNext(formData.get("next")) ?? "/cabinet/parent?welcome=1");
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = LoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error), values: keepValues(formData) };
  const { login, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { login } });
  // Однакове повідомлення для "немає користувача" і "невірний пароль" — щоб не підказувати зловмиснику
  if (!user || !(await verifyPassword(password, user.passwordHash))) return { error: "Невірний логін або пароль", values: keepValues(formData) };

  await createSession(user.id, user.role);
  redirect(safeNext(formData.get("next")) ?? homeFor(user.role));
}

export async function logout() {
  await deleteSession();
  redirect("/");
}
