import { prisma } from "@/db";
import { MOBILE_ROLES, apiError, badRequest, publicUser, readJson } from "@/lib/mobile/http";
import { issueTokens } from "@/lib/mobile/tokens";
import { verifyPassword } from "@/lib/password";
import { LOGIN_LIMITS, ipKey, loginKey, lockedMessage, lockedMinutes, recordFailure, resetFailures } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { LoginSchema } from "@/lib/validation";

/** Вхід за email/логіном і паролем: для батьків (email) і дітей (логін). */
export async function POST(request: Request) {
  const body = await readJson(request);
  const parsed = LoginSchema.safeParse(body ?? {});
  if (!parsed.success) return badRequest("Вкажіть логін і пароль");
  const { login, password } = parsed.data;

  // Той самий ліміт спроб, що й у вебі: за логіном і (якщо IP відомий) за IP
  const ip = await clientIp();
  const lKey = loginKey(login);
  const iKey = ip ? ipKey(ip) : null;
  const locked = await lockedMinutes(iKey ? [lKey, iKey] : [lKey]);
  if (locked) return apiError(429, "too_many_attempts", lockedMessage(locked));

  const user = await prisma.user.findUnique({ where: { login } });
  // Однакова відповідь для «немає користувача» і «невірний пароль»
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    await recordFailure(lKey, LOGIN_LIMITS.maxPerLogin);
    if (iKey) await recordFailure(iKey, LOGIN_LIMITS.maxPerIp);
    return apiError(401, "invalid_credentials", "Невірний логін або пароль");
  }
  if (!(MOBILE_ROLES as readonly string[]).includes(user.role)) {
    return apiError(403, "role_not_supported", "Додаток призначений для учнів і батьків. Викладачі та адміністратори входять на сайті.");
  }

  await resetFailures(lKey);
  return Response.json({ user: publicUser(user), ...(await issueTokens(user)) });
}
