import { decodeAppleNotification } from "@/lib/iap/apple";
import { applyStoreUpdate } from "@/lib/iap/grant";
import { appleNotificationState } from "@/lib/iap/mapping";
import { IapNotConfigured, IapRejected } from "@/lib/iap/types";
import { apiError, badRequest, readJson } from "@/lib/mobile/http";

/**
 * App Store Server Notifications V2 (адреса вказується в App Store Connect). Підпис перевіряється за
 * кореневими сертифікатами Apple, тож автентифікація не потрібна. Apple повторює запит, доки не отримає 200.
 */
export async function POST(request: Request) {
  const body = await readJson(request);
  if (typeof body?.signedPayload !== "string") return badRequest();
  try {
    const n = await decodeAppleNotification(body.signedPayload);
    const state = appleNotificationState(n.type, n.subtype);
    if (state && n.tx?.originalTransactionId && n.tx.expiresDate) {
      await applyStoreUpdate(n.tx.originalTransactionId, state, new Date(n.tx.expiresDate));
    }
    return new Response(null, { status: 200 });
  } catch (e) {
    if (e instanceof IapNotConfigured) return apiError(503, "iap_unavailable", "Не налаштовано");
    if (e instanceof IapRejected) return badRequest("Недійсне сповіщення");
    throw e;
  }
}
