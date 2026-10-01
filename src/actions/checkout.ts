"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { findCoveringSubscription } from "@/lib/access";
import { applyPaymentEvent, newOrderReference } from "@/lib/billing";
import { requireUser } from "@/lib/dal";
import { LEGAL_VERSION, PLANS } from "@/lib/plans";
import { requestMeta } from "@/lib/request";
import { CheckoutSchema, firstError, keepValues, type FormState } from "@/lib/validation";
import { getWfpConfig, removeRegularPayment } from "@/lib/wayforpay";

/** Крок 1 оплати: перевіряємо форму, записуємо згоди, створюємо підписку "очікує оплату". */
export async function startCheckout(_prev: FormState, formData: FormData): Promise<FormState> {
  const parent = await requireUser("parent");
  const parsed = CheckoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error), values: keepValues(formData) };
  const { plan, studentId, courseId } = parsed.data;

  const [child] = await db
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.id, studentId), eq(schema.users.parentId, parent.id)));
  if (!child) return { error: "Оберіть дитину зі свого кабінету", values: keepValues(formData) };

  let course: typeof schema.courses.$inferSelect | undefined;
  if (!PLANS[plan].allCourses) {
    if (!courseId) return { error: "Оберіть курс", values: keepValues(formData) };
    [course] = await db.select().from(schema.courses).where(eq(schema.courses.id, courseId));
    if (!course || course.status !== "published") return { error: "Цей курс ще недоступний для оплати", values: keepValues(formData) };
  }

  const existing = await db
    .select()
    .from(schema.subscriptions)
    .where(and(eq(schema.subscriptions.studentId, child.id), inArray(schema.subscriptions.status, ["active", "past_due"])));
  if (course ? findCoveringSubscription(existing, course.id) : existing.some((s) => s.plan === "premium")) {
    return { error: "У дитини вже є діюча підписка на це. Керувати нею можна в кабінеті батьків.", values: keepValues(formData) };
  }

  const orderReference = newOrderReference();
  const [sub] = await db
    .insert(schema.subscriptions)
    .values({
      parentId: parent.id,
      studentId: child.id,
      plan,
      courseId: course?.id ?? null,
      orderReference,
      amount: PLANS[plan].price,
    })
    .returning();

  // Дві окремі згоди — доказ, що батьки прийняли оферту і погодились на негайний доступ
  const meta = await requestMeta();
  await db.insert(schema.consents).values([
    { userId: parent.id, type: "offer", documentVersion: LEGAL_VERSION, subjectId: sub.id, ...meta },
    { userId: parent.id, type: "immediate_access", documentVersion: LEGAL_VERSION, subjectId: sub.id, ...meta },
  ]);

  redirect(`/checkout/${orderReference}`);
}

/** Скасування: зупиняємо регулярні списання, доступ лишається до кінця оплаченого місяця. */
export async function cancelSubscription(formData: FormData) {
  const parent = await requireUser("parent");
  const id = String(formData.get("subscriptionId") ?? "");
  const [sub] = await db
    .select()
    .from(schema.subscriptions)
    .where(and(eq(schema.subscriptions.id, id), eq(schema.subscriptions.parentId, parent.id)));
  if (!sub || sub.status === "canceled") return;

  const cfg = getWfpConfig();
  if (cfg && sub.status !== "pending") {
    const ok = await removeRegularPayment(cfg, sub.orderReference).catch(() => false);
    if (!ok) console.error("Не вдалося скасувати регулярний платіж у WayForPay — перевірте WAYFORPAY_MERCHANT_PASSWORD", sub.orderReference);
  }
  await db.update(schema.subscriptions).set({ status: "canceled", canceledAt: new Date() }).where(eq(schema.subscriptions.id, sub.id));
  revalidatePath("/cabinet/parent");
}

/** ЛИШЕ для розробки: імітує успішну оплату без WayForPay. */
export async function simulatePayment(formData: FormData) {
  if (process.env.NODE_ENV === "production" || getWfpConfig()) throw new Error("Тестова оплата вимкнена");
  const parent = await requireUser("parent");
  const ref = String(formData.get("orderReference") ?? "");
  const [sub] = await db
    .select()
    .from(schema.subscriptions)
    .where(and(eq(schema.subscriptions.orderReference, ref), eq(schema.subscriptions.parentId, parent.id)));
  if (!sub) return;
  await applyPaymentEvent({
    merchantAccount: "dev",
    merchantSignature: "dev",
    orderReference: sub.orderReference,
    amount: sub.amount,
    currency: "UAH",
    transactionStatus: "Approved",
    processingDate: Math.floor(Date.now() / 1000),
    recToken: "dev-token",
  });
  redirect("/cabinet/parent?payment=done");
}
