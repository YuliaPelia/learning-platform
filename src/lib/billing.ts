import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { extendPeriod } from "./access";
import { formatDate } from "./format";
import { appUrl, sendEmail } from "./mailer";
import { PLANS } from "./plans";
import type { WfpCallback } from "./wayforpay";

/**
 * Регулярні списання WayForPay приходять з orderReference виду "ITC-abc_WFPREG-3".
 * Відрізаємо суфікс, щоб знайти "батьківську" підписку.
 */
export function baseOrderReference(ref: string) {
  return ref.replace(/_WFPREG-\d+$/i, "");
}

export function isStalePending(sub: { status: string; createdAt: Date }, now = Date.now()) {
  return sub.status === "pending" && now - sub.createdAt.getTime() > 24 * 60 * 60 * 1000;
}

export function newOrderReference() {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ITC-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

/**
 * Обробка результату платежу (з callback-а WayForPay або тестової оплати).
 * Ідемпотентна: повторний той самий callback нічого не змінює.
 */
export async function applyPaymentEvent(cb: WfpCallback): Promise<"ok" | "duplicate" | "unknown_order" | "amount_mismatch"> {
  const [sub] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.orderReference, baseOrderReference(cb.orderReference)));
  if (!sub) return "unknown_order";

  const eventKey = `${cb.orderReference}:${cb.processingDate ?? cb.createdDate ?? "na"}:${cb.transactionStatus}`;
  const inserted = await db
    .insert(schema.payments)
    .values({
      subscriptionId: sub.id,
      orderReference: cb.orderReference,
      amount: String(cb.amount),
      currency: cb.currency,
      transactionStatus: cb.transactionStatus,
      eventKey,
      raw: cb,
    })
    .onConflictDoNothing()
    .returning({ id: schema.payments.id });
  if (!inserted.length) return "duplicate";

  const [parent] = await db.select().from(schema.users).where(eq(schema.users.id, sub.parentId));
  const planName = PLANS[sub.plan].name;

  switch (cb.transactionStatus) {
    case "Approved": {
      if (cb.currency !== "UAH" || Number(cb.amount) < sub.amount) {
        console.error("Сума платежу не збігається з підпискою", cb.orderReference, cb.amount, sub.amount);
        return "amount_mismatch";
      }
      const firstPayment = sub.status === "pending";
      const currentPeriodEnd = extendPeriod(sub.currentPeriodEnd);
      await db
        .update(schema.subscriptions)
        .set({
          // скасовану підписку не "воскрешаємо", але оплачений місяць надаємо
          status: sub.status === "canceled" ? "canceled" : "active",
          currentPeriodEnd,
          recToken: cb.recToken || sub.recToken,
        })
        .where(eq(schema.subscriptions.id, sub.id));
      await sendEmail(
        parent?.email,
        firstPayment ? `Оплата пройшла: тариф «${planName}» активовано` : `Підписку «${planName}» продовжено`,
        `Дякуємо! Оплата ${cb.amount} грн пройшла успішно.\nДоступ діє до ${formatDate(currentPeriodEnd)}\n\n` +
          `Керувати підпискою або скасувати її: ${appUrl("/cabinet/parent")}\nПублічна оферта: ${appUrl("/legal/oferta")}\n\nКоманда ITCodeCraft`,
      );
      return "ok";
    }
    case "Declined":
    case "Expired": {
      if (sub.status === "active") {
        await db.update(schema.subscriptions).set({ status: "past_due" }).where(eq(schema.subscriptions.id, sub.id));
        await sendEmail(
          parent?.email,
          "Не вдалося списати оплату за навчання",
          `Щомісячне списання за тариф «${planName}» не пройшло${cb.reason ? ` (${cb.reason})` : ""}.\n` +
            `Доступ збережеться ще 3 дні. Перевірте картку або оформіть підписку знову: ${appUrl("/pricing")}\n\nКоманда ITCodeCraft`,
        );
      }
      return "ok";
    }
    case "Refunded":
    case "Voided": {
      await db
        .update(schema.subscriptions)
        .set({ status: "canceled", canceledAt: new Date(), currentPeriodEnd: new Date() })
        .where(eq(schema.subscriptions.id, sub.id));
      return "ok";
    }
    default:
      return "ok"; // Pending, InProcessing тощо — чекаємо фінального статусу
  }
}
