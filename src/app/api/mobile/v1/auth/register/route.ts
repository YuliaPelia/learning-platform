import { prisma } from "@/db";
import { badRequest, apiError, publicUser, readJson } from "@/lib/mobile/http";
import { issueTokens } from "@/lib/mobile/tokens";
import { hashPassword } from "@/lib/password";
import { LEGAL_VERSION } from "@/lib/plans";
import { requestMeta } from "@/lib/request";
import { RegisterSchema, firstError } from "@/lib/validation";

/** Реєстрація батьків за email і паролем. Дітей додає батько в кабінеті. */
export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) return badRequest();
  // Додаток передає ageConfirm як boolean; схема веб-форми чекає "on"
  const parsed = RegisterSchema.safeParse({ ...body, ageConfirm: body.ageConfirm === true ? "on" : "" });
  if (!parsed.success) return badRequest(firstError(parsed.error));
  const { name, email, password } = parsed.data;

  const exists = await prisma.user.findFirst({ where: { OR: [{ login: email }, { email }] }, select: { id: true } });
  if (exists) return apiError(409, "email_taken", "Акаунт з таким email уже існує. Спробуйте увійти.");

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
