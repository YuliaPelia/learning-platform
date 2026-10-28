import { timingSafeEqual } from "node:crypto";
import { iapConfig } from "@/lib/iap/config";
import { verifyGoogle } from "@/lib/iap/google";
import { applyStoreUpdate } from "@/lib/iap/grant";
import { IapNotConfigured, IapRejected } from "@/lib/iap/types";
import { apiError, badRequest, readJson } from "@/lib/mobile/http";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Google Play RTDN через Pub/Sub push: `?token=<GOOGLE_RTDN_TOKEN>`. У повідомленні лише purchaseToken —
 * актуальний стан завжди перепитуємо в Google, тому підробка повідомлення нічого не дасть.
 */
export async function POST(request: Request) {
  const secret = iapConfig().googleRtdnToken;
  if (!secret) return apiError(503, "iap_unavailable", "Не налаштовано");
  if (!same(new URL(request.url).searchParams.get("token") ?? "", secret)) return apiError(401, "unauthorized", "Недійсний токен");

  const body = await readJson(request);
  const data = (body?.message as { data?: string } | undefined)?.data;
  if (!data) return badRequest();
  let note: { subscriptionNotification?: { purchaseToken?: string } };
  try {
    note = JSON.parse(Buffer.from(data, "base64").toString("utf8"));
  } catch {
    return badRequest();
  }
  const purchaseToken = note.subscriptionNotification?.purchaseToken;
  if (!purchaseToken) return new Response(null, { status: 200 }); // тестове сповіщення чи інший тип

  try {
    const v = await verifyGoogle(purchaseToken);
    await applyStoreUpdate(v.externalId, v.state, v.expiresAt);
    return new Response(null, { status: 200 });
  } catch (e) {
    if (e instanceof IapRejected) return new Response(null, { status: 200 }); // невідома покупка — повторювати марно
    if (e instanceof IapNotConfigured) return apiError(503, "iap_unavailable", "Тимчасово недоступно");
    throw e;
  }
}
