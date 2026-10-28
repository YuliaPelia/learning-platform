import type { SubscriptionStatus } from "@/generated/prisma/enums";
import type { StoreState } from "./types";

/**
 * Стан із магазину → статус підписки в нашій базі (див. isSubscriptionLive в access.ts):
 * canceled — доступ лишається до кінця оплаченого періоду; past_due — пільговий період; expired/revoked — доступу немає.
 */
export function statusFromStore(state: StoreState): SubscriptionStatus {
  switch (state) {
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    default:
      return "canceled";
  }
}

/** Кінець доступу: після відкликання (повернення коштів) — одразу, інакше — кінець оплаченого періоду. */
export function accessEnd(state: StoreState, expiresAt: Date, now: Date = new Date()): Date {
  return state === "revoked" ? now : expiresAt;
}

/** Apple Server Notifications V2: тип + підтип → стан. null — подія не змінює доступ. */
export function appleNotificationState(type: string, subtype?: string): StoreState | null {
  switch (type) {
    case "SUBSCRIBED":
    case "DID_RENEW":
    case "OFFER_REDEEMED":
    case "RENEWAL_EXTENDED":
      return "active";
    case "DID_FAIL_TO_RENEW":
      return subtype === "GRACE_PERIOD" ? "past_due" : "expired";
    case "DID_CHANGE_RENEWAL_STATUS":
      return subtype === "AUTO_RENEW_DISABLED" ? "canceled" : subtype === "AUTO_RENEW_ENABLED" ? "active" : null;
    case "EXPIRED":
    case "GRACE_PERIOD_EXPIRED":
      return "expired";
    case "REFUND":
    case "REVOKE":
      return "revoked";
    default:
      return null;
  }
}

/** Google subscriptionsv2: SUBSCRIPTION_STATE_* → стан. */
export function googleState(state: string): StoreState {
  switch (state) {
    case "SUBSCRIPTION_STATE_ACTIVE":
      return "active";
    case "SUBSCRIPTION_STATE_CANCELED": // скасована, але діє до кінця періоду
      return "canceled";
    case "SUBSCRIPTION_STATE_IN_GRACE_PERIOD":
      return "past_due";
    case "SUBSCRIPTION_STATE_ON_HOLD":
    case "SUBSCRIPTION_STATE_PAUSED":
    case "SUBSCRIPTION_STATE_EXPIRED":
    case "SUBSCRIPTION_STATE_PENDING":
    case "SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED":
    default:
      return "expired";
  }
}
