import { deleteAccount } from "@/lib/account";
import { apiError, badRequest, readJson, requireMobileUser } from "@/lib/mobile/http";

/**
 * Видалення власного акаунта з додатку (App Store 5.1.1(v), Google Play account deletion).
 * Тіло { confirm: true } — захист від випадкового виклику. Після успіху всі сесії недійсні.
 */
export async function POST(request: Request) {
  const auth = await requireMobileUser(request);
  if (!auth.user) return auth.response;
  const body = await readJson(request);
  if (body?.confirm !== true) return badRequest("Потрібне підтвердження видалення");

  const res = await deleteAccount(auth.user);
  if (!res.ok) return apiError(409, "cannot_delete", res.error);
  return new Response(null, { status: 204 });
}
