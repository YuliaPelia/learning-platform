import * as z from "zod";
import { prisma } from "@/db";
import { apiError, badRequest, publicUser, readJson } from "@/lib/mobile/http";
import { issueTokens, readSignupTicket } from "@/lib/mobile/tokens";
import { LEGAL_VERSION } from "@/lib/plans";
import { requestMeta } from "@/lib/request";
import { firstError, GoogleParentSchema, GoogleStudentSchema } from "@/lib/validation";

const Body = z.object({ signupToken: z.string().min(1), role: z.enum(["parent", "student"]) });

/** Завершення реєстрації через Google/Apple: людина обирає роль (батько/дитина) і підтверджує дані. */
export async function POST(request: Request) {
  const body = await readJson(request);
  const head = Body.safeParse(body ?? {});
  if (!body || !head.success) return badRequest();

  const ticket = await readSignupTicket(head.data.signupToken);
  if (!ticket) return apiError(401, "signup_expired", "Час реєстрації минув. Увійдіть ще раз.");

  const subField = ticket.provider === "google" ? "googleSub" : "appleSub";
  const email = ticket.email;
  const taken = await prisma.user.findFirst({
    where: { OR: [{ [subField]: ticket.sub }, ...(email ? [{ email }, { login: email }] : [])] },
    select: { id: true },
  });
  if (taken) return apiError(409, "email_taken", "Акаунт з таким email уже існує. Спробуйте увійти.");

  // Без пошти (Apple) логін формуємо із sub: він унікальний і не збігається з email-логінами
  const identity = { login: email ?? `apple.${ticket.sub}`, email, [subField]: ticket.sub, passwordHash: null };

  if (head.data.role === "parent") {
    const parsed = GoogleParentSchema.safeParse({ name: body.name, ageConfirm: body.ageConfirm === true ? "on" : "" });
    if (!parsed.success) return badRequest(firstError(parsed.error));
    const user = await prisma.user.create({
      data: {
        ...identity,
        role: "parent",
        name: parsed.data.name,
        consents: { create: { type: "age_confirm", documentVersion: LEGAL_VERSION, ...(await requestMeta()) } },
      },
    });
    return Response.json({ user: publicUser(user), ...(await issueTokens(user)) }, { status: 201 });
  }

  const parsed = GoogleStudentSchema.safeParse({ name: body.name, birthYear: body.birthYear });
  if (!parsed.success) return badRequest(firstError(parsed.error));
  const user = await prisma.user.create({
    data: { ...identity, role: "student", name: parsed.data.name, birthYear: parsed.data.birthYear },
  });
  return Response.json({ user: publicUser(user), ...(await issueTokens(user)) }, { status: 201 });
}
