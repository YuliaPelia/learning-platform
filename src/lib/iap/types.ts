/** Те, що ми дізнались від магазину про підписку після перевірки підпису/квитанції. */
export type StoreState = "active" | "canceled" | "past_due" | "expired" | "revoked";

export type VerifiedSubscription = {
  provider: "apple" | "google";
  /** Apple: originalTransactionId; Google: purchaseToken — стабільний id підписки між поновленнями. */
  externalId: string;
  productId: string;
  expiresAt: Date;
  state: StoreState;
  sandbox: boolean;
};

export type IapInput = { token: string; productId: string };

export class IapNotConfigured extends Error {}
export class IapRejected extends Error {}
