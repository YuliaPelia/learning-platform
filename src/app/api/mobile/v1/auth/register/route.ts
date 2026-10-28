import { prisma } from "@/db";
import { EMAIL_CODE_MAX_ATTEMPTS, emailCodeMatches, emailCodeSecret } from "@/lib/email-code";
import { badRequest, apiError, publicUser, readJson } from "@/lib/mobile/http";
import { issueTokens } from "@/lib/mobile/tokens";
import { hashPassword } from "@/lib/password";
import { LEGAL_VERSION } from "@/lib/plans";
import { requestMeta } from "@/lib/request";
import { EmailCodeSchema, RegisterSchema, firstError } from "@/lib/validation";

/** Реєстрація батьків за email і паролем. Дітей додає батько в кабінеті. Код із листа обов'язковий. */
export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) return badRequest();
  // Додаток передає ageConfirm як boolean; схема веб-форми чекає "on"
  const parsed = RegisterSchema.safeParse({ ...body, ageConfirm: body.ageConfirm === true ? "on" : "" });
  if (!parsed.success) return badRequest(firstError(parsed.error));
  const code = EmailCodeSchema.safeParse(typeof body.code === "string" ? body.code.trim() : "");
  if (!code.success) return badRequest(firstError(code.error));
  const { name, email, password } = parsed.data;

  const exists = await prisma.user.findFirst({ where: { OR: [{ login: email }, { email }] }, select: { id: true } });
  if (exists) return apiError(409, "email_taken", "Акаунт з таким email уже існує. Спробуйте увійти.");

  const pending = await prisma.emailCode.findUnique({ where: { email } });
  const now = new Date();
  if (!pending || pending.expiresAt <= now) {
    return apiError(400, "code_expired", "Код недійсний або прострочений. Надішліть новий.");
  }
  if (pending.attempts >= EMAIL_CODE_MAX_ATTEMPTS) {
    return apiError(400, "too_many_attempts", "Забагато спроб. Надішліть новий код.");
  }
  if (!emailCodeMatches(code.data, pending.codeHash, emailCodeSecret())) {
    await prisma.emailCode.update({ where: { email }, data: { attempts: { increment: 1 } } });
    return apiError(400, "wrong_code", "Невірний код із листа.");
  }
  await prisma.emailCode.delete({ where: { email } });

  const user = await prisma.user.create({
    data: {
      role: "parent",
      login: email,
      email,
      name,
      passwordHash: await hashPassword(password),
      consents: { create: { type: "age_confirm", documentVersion: LEGAL_VERSION, ...(await requestMeta()) } },
    },
  });
  return Response.json({ user: publicUser(user), ...(await issueTokens(user)) }, { status: 201 });
}
