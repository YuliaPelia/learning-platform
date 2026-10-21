import { MOBILE_ROLES, apiError, badRequest, publicUser, readJson } from "@/lib/mobile/http";
import { rotateRefreshToken } from "@/lib/mobile/tokens";

/** Обмін refresh-токена на нову пару токенів. Старий refresh після цього недійсний. */
export async function POST(request: Request) {
  const body = await readJson(request);
  const token = typeof body?.refreshToken === "string" ? body.refreshToken : "";
  if (!token) return badRequest();

  const result = await rotateRefreshToken(token);
  if (!result || !(MOBILE_ROLES as readonly string[]).includes(result.user.role)) {
    return apiError(401, "invalid_refresh_token", "Сесія завершилась. Увійдіть ще раз.");
  }
  return Response.json({ user: publicUser(result.user), ...result.tokens });
}
