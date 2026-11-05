import "server-only";
import { prisma } from "@/db";
import {
  EMAIL_CODE_MAX_ATTEMPTS,
  EMAIL_CODE_TTL_MS,
  emailCodeMatches,
  emailCodeSecret,
  generateEmailCode,
  hashEmailCode,
  passwordResetLetter,
  resendWaitSeconds,
} from "./email-code";
import { sendEmail } from "./mailer";
import { hashPassword } from "./password";
import { loginKey, resetFailures } from "./rate-limit";

/**
 * Відновлення пароля кодом із листа. Коди лежать у тій самій таблиці email_codes, що й коди
 * реєстрації, але з ключем "reset:<email>" — тож код реєстрації не підходить для зміни пароля і навпаки.
 */
export const resetCodeKey = (email: string) => `reset:${email}`;

/** Акаунт, якому можна змінити пароль за цією поштою (видалені — ні). */
function findUserByEmail(email: string) {
  return prisma.user.findFirst({ where: { email, deletedAt: null }, select: { id: true, login: true } });
}

export type RequestResetResult = { ok: true } | { ok: false; error: string };

/**
 * Надсилає код. Якщо акаунта з такою поштою немає — теж відповідаємо «ok» і нічого не шлемо,
 * щоб форма не підказувала, чия пошта зареєстрована.
 */
export async function requestPasswordReset(email: string, now = new Date()): Promise<RequestResetResult> {
  const key = resetCodeKey(email);
  const pending = await prisma.emailCode.findUnique({ where: { email: key } });
  if (pending) {
    const wait = resendWaitSeconds(pending.sentAt, now);
    if (wait > 0) return { ok: false, error: `Лист уже надіслано. Повторно можна через ${wait} с.` };
  }

  const user = await findUserByEmail(email);
  if (!user) return { ok: true };

  const code = generateEmailCode();
  const letter = passwordResetLetter(code);
  if (!(await sendEmail(email, letter.subject, letter.text))) {
    return { ok: false, error: "Не вдалося надіслати лист. Спробуйте ще раз за хвилину." };
  }

  const data = {
    codeHash: hashEmailCode(code, emailCodeSecret()),
    expiresAt: new Date(now.getTime() + EMAIL_CODE_TTL_MS),
    sentAt: now,
    attempts: 0,
  };
  await prisma.emailCode.upsert({ where: { email: key }, create: { email: key, ...data }, update: data });
  return { ok: true };
}

export type ResetResult = { ok: true; userId: string } | { ok: false; error: string };

/** Перевіряє код і ставить новий пароль. Код одноразовий; 5 хибних спроб — потрібен новий лист. */
export async function resetPassword(email: string, code: string, newPassword: string, now = new Date()): Promise<ResetResult> {
  const key = resetCodeKey(email);
  const pending = await prisma.emailCode.findUnique({ where: { email: key } });
  if (!pending || pending.expiresAt <= now) return { ok: false, error: "Код недійсний або прострочений. Надішліть новий." };
  if (pending.attempts >= EMAIL_CODE_MAX_ATTEMPTS) return { ok: false, error: "Забагато спроб. Надішліть новий код." };
  if (!emailCodeMatches(code, pending.codeHash, emailCodeSecret())) {
    await prisma.emailCode.update({ where: { email: key }, data: { attempts: { increment: 1 } } });
    return { ok: false, error: "Невірний код із листа." };
  }

  const user = await findUserByEmail(email);
  await prisma.emailCode.delete({ where: { email: key } });
  if (!user) return { ok: false, error: "Код недійсний або прострочений. Надішліть новий." };

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } }),
    // Старий пароль міг бути в чужих руках — виходимо з усіх пристроїв мобільного застосунку
    prisma.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: now } }),
  ]);
  // Блокування після невдалих входів знімаємо — людина щойно довела, що це її пошта
  await resetFailures(loginKey(user.login));
  return { ok: true, userId: user.id };
}
