import { apiError, badRequest, publicUser, readJson } from "@/lib/mobile/http";
import { signInWithProvider, verifyAppleToken } from "@/lib/mobile/social";

/** Вхід через apple: додаток передає токен від нативного SDK, а сервер його перевіряє. */
export async function POST(request: Request) {
  const body = await readJson(request);
  const token = typeof body?.identityToken === "string" ? body.identityToken : "";
  if (!body || !token) return badRequest();

  let profile;
  try {
    profile = await verifyAppleToken(token, typeof body.fullName === "string" ? body.fullName : undefined);
  } catch {
    return apiError(401, "invalid_token", "Не вдалося підтвердити вхід. Спробуйте ще раз.");
  }

  const result = await signInWithProvider("apple", profile);
  if (result.type === "reject") {
    if (result.reason === "role") return apiError(403, "role_not_supported", "Додаток призначений для учнів і батьків.");
    return apiError(result.reason === "conflict" ? 409 : 401, "social_rejected", "Цей акаунт не можна використати для входу.");
  }
  if (result.type === "signup") {
    return Response.json({ status: "signup_required", signupToken: result.signupToken, email: result.email, name: result.name });
  }
  return Response.json({ status: "ok", user: publicUser(result.user), ...result.tokens });
}
