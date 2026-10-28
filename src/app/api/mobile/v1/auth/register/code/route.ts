import { prisma } from "@/db";
import {
  EMAIL_CODE_TTL_MS,
  emailCodeLetter,
  emailCodeSecret,
  generateEmailCode,
  hashEmailCode,
  resendWaitSeconds,
} from "@/lib/email-code";
import { sendEmail } from "@/lib/mailer";
import { apiError, badRequest, readJson } from "@/lib/mobile/http";
import { RegisterSchema, firstError } from "@/lib/validation";

/** Надсилає код на пошту. Акаунт з'явиться лише після POST /auth/register з цим кодом. */
export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) return badRequest();
  const parsed = RegisterSchema.safeParse({ ...body, ageConfirm: body.ageConfirm === true ? "on" : "" });
  if (!parsed.success) return badRequest(firstError(parsed.error));
  const { email } = parsed.data;

  const exists = await prisma.user.findFirst({ where: { OR: [{ login: email }, { email }] }, select: { id: true } });
  if (exists) return apiError(409, "email_taken", "Акаунт з таким email уже існує. Спробуйте увійти.");

  const pending = await prisma.emailCode.findUnique({ where: { email } });
  const now = new Date();
  if (pending) {
    const wait = resendWaitSeconds(pending.sentAt, now);
    if (wait > 0) return apiError(429, "too_soon", `Зачекайте ${wait} с перед повторним листом.`);
  }

  const code = generateEmailCode();
  const letter = emailCodeLetter(code);
  const sent = await sendEmail(email, letter.subject, letter.text);
  if (!sent) return apiError(503, "email_failed", "Не вдалося надіслати лист. Спробуйте ще раз за хвилину.");

  const data = {
    codeHash: hashEmailCode(code, emailCodeSecret()),
    expiresAt: new Date(now.getTime() + EMAIL_CODE_TTL_MS),
    sentAt: now,
    attempts: 0,
  };
  await prisma.emailCode.upsert({ where: { email }, create: { email, ...data }, update: data });
  return Response.json({ ok: true });
}
