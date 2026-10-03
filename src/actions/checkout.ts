"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/db";
import { findCoveringSubscription } from "@/lib/access";
import { applyPaymentEvent, newOrderReference } from "@/lib/billing";
import { requireUser } from "@/lib/dal";
import { toAccessSub } from "@/lib/learning";
import { LEGAL_VERSION, PLANS, PLAN_RANK } from "@/lib/plans";
import { requestMeta } from "@/lib/request";
import { CheckoutSchema, firstError, keepValues, type FormState } from "@/lib/validation";
import { getWfpConfig, removeRegularPayment } from "@/lib/wayforpay";

/** Крок 1 оплати: перевіряємо форму, записуємо згоди, створюємо підписку "очікує оплату". */
export async function startCheckout(_prev: FormState, formData: FormData): Promise<FormState> {
  const parent = await requireUser("parent");
  const parsed = CheckoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error), values: keepValues(formData) };
  const { plan: planCode, studentId, courseId } = parsed.data;
  const fail = (error: string) => ({ error, values: keepValues(formData) });

  const plan = await prisma.plan.findUnique({ where: { code: planCode } });
  if (!plan || !plan.isActive) return fail("Цей тариф зараз недоступний");

  const child = await prisma.user.findFirst({ where: { id: studentId, parentId: parent.id } });
  if (!child) return fail("Оберіть дитину зі свого кабінету");

  const oneCourse = !PLANS[planCode].allCourses;
  if (oneCourse && !courseId) return fail("Оберіть курс");
  const course = oneCourse ? await prisma.course.findUnique({ where: { id: courseId }, include: { minPlan: true } }) : null;
  if (oneCourse) {
    if (!course || course.status !== "published") return fail("Цей курс ще недоступний для оплати");
    if (PLAN_RANK[planCode] < PLAN_RANK[course.minPlan.code]) return fail("Цей курс поки відкритий лише в тарифі Преміум");
  }

  const existing = (
    await prisma.subscription.findMany({
      where: { studentId: child.id, status: { in: ["active", "past_due"] } },
      include: { plan: true },
    })
  ).map(toAccessSub);
  const alreadyCovered = course
    ? !!findCoveringSubscription(existing, course.id, new Date(), course.minPlan.code)
    : existing.some((s) => s.plan === "premium");
  if (alreadyCovered) return fail("У дитини вже є діюча підписка на це. Керувати нею можна в кабінеті батьків.");

  const orderReference = newOrderReference();
  const meta = await requestMeta();
  // Підписка і дві окремі згоди (оферта + негайний доступ) — одна транзакція
  await prisma.subscription.create({
    data: {
      userId: parent.id,
      studentId: child.id,
      planId: plan.id,
      courseId: course?.id ?? null,
      orderReference,
      amount: plan.price,
      consents: {
        create: [
          { parentId: parent.id, type: "offer", documentVersion: LEGAL_VERSION, ...meta },
          { parentId: parent.id, type: "immediate_access", documentVersion: LEGAL_VERSION, ...meta },
        ],
      },
    },
  });

  redirect(`/checkout/${orderReference}`);
}

/** Скасування: зупиняємо регулярні списання, доступ лишається до кінця оплаченого місяця. */
export async function cancelSubscription(formData: FormData) {
  const parent = await requireUser("parent");
  const id = String(formData.get("subscriptionId") ?? "");
  const sub = await prisma.subscription.findFirst({ where: { id, userId: parent.id } });
  if (!sub || sub.status === "canceled") return;

  const cfg = getWfpConfig();
  if (cfg && sub.status !== "pending") {
    const ok = await removeRegularPayment(cfg, sub.orderReference).catch(() => false);
    if (!ok) console.error("Не вдалося скасувати регулярний платіж у WayForPay — перевірте WAYFORPAY_MERCHANT_PASSWORD", sub.orderReference);
  }
  await prisma.subscription.update({ where: { id: sub.id }, data: { status: "canceled", canceledAt: new Date() } });
  revalidatePath("/cabinet/parent");
}

/** ЛИШЕ для розробки: імітує успішну оплату без WayForPay. */
export async function simulatePayment(formData: FormData) {
  if (process.env.NODE_ENV === "production" || getWfpConfig()) throw new Error("Тестова оплата вимкнена");
  const parent = await requireUser("parent");
  const ref = String(formData.get("orderReference") ?? "");
  const sub = await prisma.subscription.findFirst({ where: { orderReference: ref, userId: parent.id } });
  if (!sub) return;
  await applyPaymentEvent({
    merchantAccount: "dev",
    merchantSignature: "dev",
    orderReference: sub.orderReference,
    amount: sub.amount / 100,
    currency: "UAH",
    transactionStatus: "Approved",
    processingDate: Math.floor(Date.now() / 1000),
    recToken: "dev-token",
  });
  redirect("/cabinet/parent?payment=done");
}
