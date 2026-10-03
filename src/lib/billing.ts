import "server-only";
import { prisma } from "@/db";
import { Prisma } from "@/generated/prisma/client";
import type { PaymentStatus } from "@/generated/prisma/enums";
import { extendPeriod } from "./access";
import { formatDate, formatUah } from "./format";
import { appUrl, sendEmail } from "./mailer";
import { GRACE_DAYS } from "./plans";
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

/** Статус транзакції WayForPay → статус платежу в нашій базі. */
export function paymentStatusFrom(transactionStatus: string): PaymentStatus {
  switch (transactionStatus) {
    case "Approved":
      return "approved";
    case "Declined":
    case "Expired":
      return "declined";
    case "Refunded":
    case "Voided":
      return "refunded";
    default:
      return "pending"; // InProcessing, WaitingAuthComplete тощо
  }
}

/** WayForPay передає суму в гривнях (449 або "449.00"), у базі — копійки. */
export function toKopecks(amount: number | string) {
  return Math.round(Number(amount) * 100);
}

/**
 * Записує платіж (один рядок на orderReference). Повертає false, якщо такий самий
 * статус уже записано — тобто це повторний callback і робити нічого не треба.
 */
async function recordPayment(subscriptionId: string, cb: WfpCallback, status: PaymentStatus) {
  const paidAt = status === "approved" ? new Date((cb.processingDate ?? Math.floor(Date.now() / 1000)) * 1000) : null;
  const data = {
    amount: toKopecks(cb.amount),
    currency: cb.currency,
    status,
    raw: cb as unknown as Prisma.InputJsonValue,
    paidAt,
  };
  const existing = await prisma.payment.findUnique({ where: { orderId: cb.orderReference } });
  if (existing) {
    if (existing.status === status) return false;
    // Умова на старий статус робить оновлення атомарним, якщо два callback-и прийшли одночасно
    const { count } = await prisma.payment.updateMany({ where: { id: existing.id, status: existing.status }, data });
    return count > 0;
  }
  try {
    await prisma.payment.create({ data: { ...data, subscriptionId, orderId: cb.orderReference } });
    return true;
  } catch (e) {
    // order_id унікальний: паралельний такий самий callback уже записав платіж
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return false;
    throw e;
  }
}

/**
 * Обробка результату платежу (з callback-а WayForPay або тестової оплати).
 * Ідемпотентна: повторний той самий callback нічого не змінює.
 */
export async function applyPaymentEvent(cb: WfpCallback): Promise<"ok" | "duplicate" | "unknown_order" | "amount_mismatch"> {
  const sub = await prisma.subscription.findUnique({
    where: { orderReference: baseOrderReference(cb.orderReference) },
    include: { plan: true, user: true },
  });
  if (!sub) return "unknown_order";

  const status = paymentStatusFrom(cb.transactionStatus);
  if (!(await recordPayment(sub.id, cb, status))) return "duplicate";

  const parentEmail = sub.user.email;
  const planName = sub.plan.name;

  switch (status) {
    case "approved": {
      if (cb.currency !== "UAH" || toKopecks(cb.amount) < sub.amount) {
        console.error("Сума платежу не збігається з підпискою", cb.orderReference, cb.amount, sub.amount);
        return "amount_mismatch";
      }
      const firstPayment = sub.status === "pending";
      const endsAt = extendPeriod(sub.endsAt);
      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          // скасовану підписку не "воскрешаємо", але оплачений місяць надаємо
          status: sub.status === "canceled" ? "canceled" : "active",
          startsAt: sub.startsAt ?? new Date(),
          endsAt,
          recToken: cb.recToken || sub.recToken,
        },
      });
      await sendEmail(
        parentEmail,
        firstPayment ? `Оплата пройшла: тариф «${planName}» активовано` : `Підписку «${planName}» продовжено`,
        `Дякуємо! Оплата ${formatUah(toKopecks(cb.amount))} пройшла успішно.\nДоступ діє до ${formatDate(endsAt)}\n\n` +
          `Керувати підпискою або скасувати її: ${appUrl("/cabinet/parent")}\nПублічна оферта: ${appUrl("/legal/oferta")}\n\nКоманда ITCodeCraft`,
      );
      return "ok";
    }
    case "declined": {
      if (sub.status === "active") {
        await prisma.subscription.update({ where: { id: sub.id }, data: { status: "past_due" } });
        await sendEmail(
          parentEmail,
          "Не вдалося списати оплату за навчання",
          `Щомісячне списання за тариф «${planName}» не пройшло${cb.reason ? ` (${cb.reason})` : ""}.\n` +
            `Доступ збережеться ще ${GRACE_DAYS} дні. Перевірте картку або оформіть підписку знову: ${appUrl("/pricing")}\n\nКоманда ITCodeCraft`,
        );
      }
      return "ok";
    }
    case "refunded": {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "canceled", canceledAt: new Date(), endsAt: new Date() },
      });
      return "ok";
    }
    default:
      return "ok"; // pending — чекаємо фінального статусу
  }
}
