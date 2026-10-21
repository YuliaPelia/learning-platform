import { readJson } from "@/lib/mobile/http";
import { revokeRefreshToken } from "@/lib/mobile/tokens";

/** Вихід: відкликає refresh-токен. Завжди 204 — навіть якщо токена вже немає. */
export async function POST(request: Request) {
  const body = await readJson(request);
  if (typeof body?.refreshToken === "string" && body.refreshToken) await revokeRefreshToken(body.refreshToken);
  return new Response(null, { status: 204 });
}
