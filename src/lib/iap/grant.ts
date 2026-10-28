import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/db";
import { accessEnd, statusFromStore } from "./mapping";
import { parseProductId } from "./products";
import { IapRejected, type StoreState, type VerifiedSubscription } from "./types";

const orderReferenceFor = (provider: string, externalId: string) =>
  `IAP-${provider.toUpperCase()}-${createHash("sha256").update(externalId).digest("hex").slice(0, 24)}`;

/**
 * Записує підписку з магазину для дитини. Ідемпотентно: та сама покупка (externalId) не створює дубль,
 * а лише оновлює статус і кінець періоду. Чужу покупку (інший платник) не привласнюємо.
 * Для тарифів «1 курс на вибір» courseId лишається порожнім — курс обирають після покупки (see course route).
 */
export async function grantStoreSubscription(args: { parentId: string; childId: string; verified: VerifiedSubscription }) {
  const { parentId, childId, verified: v } = args;
  const product = parseProductId(v.productId);
  if (!product) throw new IapRejected("Невідомий товар");
  if (v.state === "expired" || v.state === "revoked") throw new IapRejected("Підписка вже не діє");

  const plan = await prisma.plan.findUnique({ where: { code: product.plan } });
  if (!plan || !plan.isActive) throw new IapRejected("Цей тариф зараз недоступний");

  const data = { status: statusFromStore(v.state), endsAt: accessEnd(v.state, v.expiresAt) };
  const existing = await prisma.subscription.findUnique({ where: { externalId: v.externalId } });
  if (existing) {
    if (existing.userId !== parentId) throw new IapRejected("Ця покупка вже привʼязана до іншого акаунта");
    return prisma.subscription.update({ where: { id: existing.id }, data });
  }
  return prisma.subscription.create({
    data: {
      ...data,
      userId: parentId,
      studentId: childId,
      planId: plan.id,
      provider: v.provider,
      externalId: v.externalId,
      storeProductId: v.productId,
      slot: product.slot,
      orderReference: orderReferenceFor(v.provider, v.externalId),
      amount: plan.price,
      startsAt: new Date(),
      canceledAt: v.state === "canceled" ? new Date() : null,
    },
  });
}

/** Оновлення від магазину (сповіщення про поновлення, скасування, повернення коштів). false — такої підписки в нас немає. */
export async function applyStoreUpdate(externalId: string, state: StoreState, expiresAt: Date) {
  const sub = await prisma.subscription.findUnique({ where: { externalId } });
  if (!sub) return false;
  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: statusFromStore(state),
      endsAt: accessEnd(state, expiresAt),
      canceledAt: state === "active" ? null : (sub.canceledAt ?? new Date()),
    },
  });
  return true;
}
