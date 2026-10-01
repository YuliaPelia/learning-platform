"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { homeFor } from "@/lib/dal";
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

  const [exists] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.login, email));
  if (exists) return { error: "Акаунт з таким email уже існує. Спробуйте увійти.", values: keepValues(formData) };

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(schema.users).values({ role: "parent", login: email, email, name, passwordHash }).returning();

  const meta = await requestMeta();
  await db.insert(schema.consents).values({ userId: user.id, type: "age_confirm", documentVersion: LEGAL_VERSION, ...meta });

  await createSession(user.id, "parent");
  redirect(safeNext(formData.get("next")) ?? "/cabinet/parent?welcome=1");
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = LoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error), values: keepValues(formData) };
  const { login, password } = parsed.data;

  const [user] = await db.select().from(schema.users).where(eq(schema.users.login, login));
  // Однакове повідомлення для "немає користувача" і "невірний пароль" — щоб не підказувати зловмиснику
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return { error: "Невірний логін або пароль", values: keepValues(formData) };

  await createSession(user.id, user.role);
  redirect(safeNext(formData.get("next")) ?? homeFor(user.role));
}

export async function logout() {
  await deleteSession();
  redirect("/");
}
