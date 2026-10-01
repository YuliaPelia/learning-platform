/**
 * serviceUrl — сюди WayForPay надсилає результат кожного платежу (і першого, і щомісячних).
 * Довіряємо лише запитам з правильним підписом.
 */
import { applyPaymentEvent } from "@/lib/billing";
import { acceptResponse, getWfpConfig, parseCallbackBody, verifyCallback } from "@/lib/wayforpay";

export async function POST(request: Request) {
  const cfg = getWfpConfig();
  if (!cfg) return Response.json({ error: "WayForPay не налаштовано" }, { status: 503 });

  const raw = await request.text();
  const cb = parseCallbackBody(raw);
  if (!cb || !verifyCallback(cb, cfg.secretKey) || cb.merchantAccount !== cfg.merchantAccount) {
    console.warn("WayForPay callback з невірним підписом — відхилено");
    return Response.json({ error: "invalid signature" }, { status: 400 });
  }

  const result = await applyPaymentEvent(cb);
  if (result === "unknown_order") console.warn("Callback для невідомого замовлення", cb.orderReference);

  // Підтверджуємо отримання, інакше WayForPay повторюватиме запит до 4 днів
  return Response.json(acceptResponse(cb.orderReference, cfg.secretKey));
}
