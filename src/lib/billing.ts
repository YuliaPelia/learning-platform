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

type Tx = Prisma.TransactionClient;

/**
 * Записує платіж (один рядок на orderReference). Повертає false, якщо такий самий
 * статус уже записано — тобто це повторний callback і робити нічого не треба.
 */
async function recordPayment(tx: Tx, subscriptionId: string, cb: WfpCallback, status: PaymentStatus, keepRaw = true) {
  const paidAt = status === "approved" ? new Date((cb.processingDate ?? Math.floor(Date.now() / 1000)) * 1000) : null;
  const data = {
    amount: toKopecks(cb.amount),
    currency: cb.currency,
    status,
    raw: keepRaw ? (cb as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
    paidAt,
  };
  const existing = await tx.payment.findUnique({ where: { orderId: cb.orderReference } });
  if (existing) {
    if (existing.status === status) return false;
    // Підтверджений платіж не "знижуємо" до declined/pending запізнілим callback-ом
    if (existing.status === "approved" && status !== "refunded") return false;
    if (existing.status === "refunded") return false;
    // Умова на старий статус робить оновлення атомарним, якщо два callback-и прийшли одночасно
    const { count } = await tx.payment.updateMany({ where: { id: existing.id, status: existing.status }, data });
    return count > 0;
  }
  try {
    await tx.payment.create({ data: { ...data, subscriptionId, orderId: cb.orderReference } });
    return true;
  } catch (e) {
    // order_id унікальний: паралельний такий самий callback уже записав платіж
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return false;
    throw e;
  }
}

type Outcome = { result: "ok" | "duplicate"; email?: { subject: string; text: string } };

/**
 * Обробка результату платежу (з callback-а WayForPay або тестової оплати).
 * Ідемпотентна: повторний той самий callback нічого не змінює.
 * Сума й валюта перевіряються ДО будь-яких змін у БД; платіж і підписка оновлюються в одній транзакції.
 */
export async function applyPaymentEvent(cb: WfpCallback): Promise<"ok" | "duplicate" | "unknown_order" | "amount_mismatch"> {
  const sub = await prisma.subscription.findUnique({
    where: { orderReference: baseOrderReference(cb.orderReference) },
    include: { plan: true, user: true },
  });
  if (!sub) return "unknown_order";

  const status = paymentStatusFrom(cb.transactionStatus);
  if (status === "approved" && (cb.currency !== "UAH" || toKopecks(cb.amount) !== sub.amount)) {
    console.error("Сума платежу не збігається з підпискою", cb.orderReference, cb.amount, sub.amount);
    return "amount_mismatch";
  }

  const planName = sub.plan.name;
  const outcome = await prisma.$transaction(async (tx): Promise<Outcome> => {
    // Акаунт платника видалено: платіж фіксуємо для обліку, але без сирих даних платіжки
    if (!(await recordPayment(tx, sub.id, cb, status, !sub.user.deletedAt))) return { result: "duplicate" };

    switch (status) {
      case "approved": {
        const firstPayment = sub.status === "pending";
        const endsAt = extendPeriod(sub.endsAt);
        await tx.subscription.update({
          where: { id: sub.id },
          data: {
            // скасовану підписку не "воскрешаємо", але оплачений місяць надаємо
            status: sub.status === "canceled" ? "canceled" : "active",
            startsAt: sub.startsAt ?? new Date(),
            endsAt,
            recToken: cb.recToken || sub.recToken,
          },
        });
        return {
          result: "ok",
          email: {
            subject: firstPayment ? `Оплата пройшла: тариф «${planName}» активовано` : `Підписку «${planName}» продовжено`,
            text:
              `Дякуємо! Оплата ${formatUah(toKopecks(cb.amount))} пройшла успішно.\nДоступ діє до ${formatDate(endsAt)}\n\n` +
              `Керувати підпискою або скасувати її: ${appUrl("/cabinet/parent")}\nПублічна оферта: ${appUrl("/legal/oferta")}\n\nКоманда ITCodeCraft`,
          },
        };
      }
      case "declined": {
        if (sub.status !== "active") return { result: "ok" };
        await tx.subscription.update({ where: { id: sub.id }, data: { status: "past_due" } });
        return {
          result: "ok",
          email: {
            subject: "Не вдалося списати оплату за навчання",
            text:
              `Щомісячне списання за тариф «${planName}» не пройшло${cb.reason ? ` (${cb.reason})` : ""}.\n` +
              `Доступ збережеться ще ${GRACE_DAYS} дні. Перевірте картку або оформіть підписку знову: ${appUrl("/pricing")}\n\nКоманда ITCodeCraft`,
          },
        };
      }
      case "refunded": {
        await tx.subscription.update({
          where: { id: sub.id },
          data: { status: "canceled", canceledAt: new Date(), endsAt: new Date() },
        });
        return { result: "ok" };
      }
      default:
        return { result: "ok" }; // pending — чекаємо фінального статусу
    }
  });

  // Лист — після транзакції; його помилка не повинна ламати обробку платежу
  if (outcome.email) await sendEmail(sub.user.email, outcome.email.subject, outcome.email.text).catch(() => {});
  return outcome.result;
}
