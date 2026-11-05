"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/db";
import { homeFor } from "@/lib/dal";
import { requestPasswordReset, resetPassword } from "@/lib/password-reset";
import { createSession } from "@/lib/session";
import { ForgotPasswordSchema, ResetPasswordSchema, firstError, keepValues, type FormState } from "@/lib/validation";

/** Крок 1: надіслати код. ok + values.email — форма переходить до кроку 2. */
export async function sendResetCode(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = ForgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error), values: keepValues(formData) };
  const result = await requestPasswordReset(parsed.data.email);
  if (!result.ok) return { error: result.error, values: keepValues(formData), ok: formData.get("step") === "code" };
  return { ok: true, values: { email: parsed.data.email } };
}

/** Крок 2: перевірити код, змінити пароль і одразу увійти. */
export async function confirmPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = keepValues(formData);
  const parsed = ResetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: true, error: firstError(parsed.error), values };
  const { email, code, password } = parsed.data;

  const result = await resetPassword(email, code, password);
  if (!result.ok) return { ok: true, error: result.error, values };

  const user = await prisma.user.findUniqueOrThrow({ where: { id: result.userId }, select: { id: true, role: true } });
  await createSession(user.id, user.role);
  redirect(homeFor(user.role));
}
