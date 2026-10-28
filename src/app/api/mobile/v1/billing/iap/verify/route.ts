import * as z from "zod";
import { prisma } from "@/db";
import { verifyApple } from "@/lib/iap/apple";
import { grantStoreSubscription } from "@/lib/iap/grant";
import { verifyGoogle } from "@/lib/iap/google";
import { parseProductId } from "@/lib/iap/products";
import { IapNotConfigured, IapRejected } from "@/lib/iap/types";
import { apiError, badRequest, readJson, requireMobileUser } from "@/lib/mobile/http";
import { PLANS } from "@/lib/plans";

const Body = z.object({
  childId: z.uuid(),
  productId: z.string().min(1).max(200),
  platform: z.enum(["apple", "google"]),
  token: z.string().min(1).max(20000),
});

/**
 * Покупка в застосунку: клієнт передає квитанцію, ми перевіряємо її в Apple/Google (клієнту не довіряємо)
 * і створюємо підписку дитини. Купувати можуть лише батьки й лише для своєї дитини.
 */
export async function POST(request: Request) {
  const auth = await requireMobileUser(request);
  if (!auth.user) return auth.response;
  if (auth.user.role !== "parent") return apiError(403, "forbidden", "Підписку оформлюють батьки");

  const parsed = Body.safeParse(await readJson(request));
  if (!parsed.success) return badRequest();
  const { childId, productId, platform, token } = parsed.data;
  if (!parseProductId(productId)) return badRequest("Невідомий товар");

  // Чужу дитину не підтверджуємо
  const child = await prisma.user.findFirst({ where: { id: childId, parentId: auth.user.id, deletedAt: null }, select: { id: true } });
  if (!child) return apiError(404, "not_found", "Профіль дитини не знайдено");

  try {
    const verified = platform === "apple" ? await verifyApple(token) : await verifyGoogle(token, productId);
    if (verified.productId !== productId) return apiError(400, "product_mismatch", "Квитанція не відповідає товару");
    const sub = await grantStoreSubscription({ parentId: auth.user.id, childId: child.id, verified });
    const plan = parseProductId(verified.productId)!.plan;
    return Response.json({
      subscription: { id: sub.id, plan, slot: sub.slot, status: sub.status, endsAt: sub.endsAt, needsCourse: !PLANS[plan].allCourses && !sub.courseId },
    });
  } catch (e) {
    if (e instanceof IapNotConfigured) return apiError(503, "iap_unavailable", "Покупки тимчасово недоступні. Спробуйте пізніше.");
    if (e instanceof IapRejected) return apiError(400, "iap_rejected", e.message);
    throw e;
  }
}
