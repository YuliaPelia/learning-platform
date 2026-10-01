/**
 * Інтеграція з WayForPay.
 * Документація: https://wiki.wayforpay.com/en/view/852102 (Purchase)
 *
 * Як це працює:
 * 1. Ми формуємо форму з даними замовлення і ПІДПИСОМ (HMAC_MD5 секретним ключем).
 * 2. Браузер відправляє форму на secure.wayforpay.com/pay — там батьки вводять картку.
 * 3. WayForPay шле нам на serviceUrl результат (теж з підписом) — ми перевіряємо підпис
 *    і лише тоді відкриваємо доступ. Підпис — як печатка: без секретного ключа її не підробити.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const WFP_PAY_URL = "https://secure.wayforpay.com/pay";
export const WFP_REGULAR_API = "https://api.wayforpay.com/regularApi";

export type WfpConfig = {
  merchantAccount: string;
  merchantDomainName: string;
  secretKey: string;
  merchantPassword?: string;
};

export function getWfpConfig(): WfpConfig | null {
  const merchantAccount = process.env.WAYFORPAY_MERCHANT_ACCOUNT;
  const secretKey = process.env.WAYFORPAY_SECRET_KEY;
  if (!merchantAccount || !secretKey) return null;
  return {
    merchantAccount,
    secretKey,
    merchantDomainName: process.env.WAYFORPAY_MERCHANT_DOMAIN || new URL(process.env.APP_URL ?? "http://localhost").host,
    merchantPassword: process.env.WAYFORPAY_MERCHANT_PASSWORD || undefined,
  };
}

export function hmacMd5(data: string, key: string): string {
  return createHmac("md5", key).update(data, "utf8").digest("hex");
}

/** Рядок для підпису запиту Purchase (порядок полів — з документації). */
export function purchaseSignatureString(p: {
  merchantAccount: string;
  merchantDomainName: string;
  orderReference: string;
  orderDate: number;
  amount: string;
  currency: string;
  productName: string[];
  productCount: (number | string)[];
  productPrice: (number | string)[];
}): string {
  return [
    p.merchantAccount,
    p.merchantDomainName,
    p.orderReference,
    p.orderDate,
    p.amount,
    p.currency,
    ...p.productName,
    ...p.productCount,
    ...p.productPrice,
  ].join(";");
}

/** DD.MM.YYYY — формат дат WayForPay. */
export function wfpDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

export type PurchaseInput = {
  orderReference: string;
  orderDate: number; // unix seconds
  amount: number; // грн
  productName: string;
  clientEmail?: string | null;
  returnUrl: string;
  serviceUrl: string;
  /** Дата першого повторного списання (через місяць). */
  nextChargeDate: Date;
  /** До якої дати діє регулярний платіж. */
  regularEndDate: Date;
};

/**
 * Поля форми для Purchase з регулярним (щомісячним) платежем.
 * Повертає пари [name, value] — бо productName[] тощо можуть повторюватися.
 */
export function buildPurchaseFields(cfg: WfpConfig, input: PurchaseInput): Array<[string, string]> {
  const amount = input.amount.toFixed(2);
  const signature = hmacMd5(
    purchaseSignatureString({
      merchantAccount: cfg.merchantAccount,
      merchantDomainName: cfg.merchantDomainName,
      orderReference: input.orderReference,
      orderDate: input.orderDate,
      amount,
      currency: "UAH",
      productName: [input.productName],
      productCount: [1],
      productPrice: [amount],
    }),
    cfg.secretKey,
  );

  const fields: Array<[string, string]> = [
    ["merchantAccount", cfg.merchantAccount],
    ["merchantDomainName", cfg.merchantDomainName],
    ["merchantTransactionSecureType", "AUTO"],
    ["merchantSignature", signature],
    ["orderReference", input.orderReference],
    ["orderDate", String(input.orderDate)],
    ["amount", amount],
    ["currency", "UAH"],
    ["productName[]", input.productName],
    ["productPrice[]", amount],
    ["productCount[]", "1"],
    ["language", "UA"],
    ["returnUrl", input.returnUrl],
    ["serviceUrl", input.serviceUrl],
    // Регулярний платіж: щомісяця, сума фіксована, клієнт бачить це на сторінці оплати
    ["regularMode", "monthly"],
    ["regularAmount", amount],
    ["regularOn", "1"],
    ["regularBehavior", "preset"],
    ["dateNext", wfpDate(input.nextChargeDate)],
    ["dateEnd", wfpDate(input.regularEndDate)],
  ];
  if (input.clientEmail) fields.push(["clientEmail", input.clientEmail]);
  return fields;
}

export type WfpCallback = {
  merchantAccount: string;
  orderReference: string;
  merchantSignature: string;
  amount: number | string;
  currency: string;
  authCode?: string;
  email?: string;
  phone?: string;
  createdDate?: number;
  processingDate?: number;
  cardPan?: string;
  cardType?: string;
  recToken?: string;
  transactionStatus: string; // Approved | Declined | Expired | Pending | Refunded | ...
  reason?: string;
  reasonCode?: number | string;
  fee?: number;
  paymentSystem?: string;
};

/** Рядок підпису callback-а (порядок полів — з документації). */
export function callbackSignatureString(c: WfpCallback): string {
  return [
    c.merchantAccount,
    c.orderReference,
    c.amount,
    c.currency,
    c.authCode ?? "",
    c.cardPan ?? "",
    c.transactionStatus,
    c.reasonCode ?? "",
  ].join(";");
}

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function verifyCallback(c: WfpCallback, secretKey: string): boolean {
  if (!c?.merchantSignature) return false;
  return safeEqualHex(hmacMd5(callbackSignatureString(c), secretKey), c.merchantSignature);
}

/** Відповідь, яку WayForPay чекає від нас — інакше буде надсилати callback до 4 днів. */
export function acceptResponse(orderReference: string, secretKey: string, time = Math.floor(Date.now() / 1000)) {
  const status = "accept";
  return {
    orderReference,
    status,
    time,
    signature: hmacMd5([orderReference, status, time].join(";"), secretKey),
  };
}

/**
 * WayForPay інколи надсилає JSON із заголовком form-urlencoded
 * (тоді весь JSON стає "ключем" форми). Розбираємо обидва варіанти.
 */
export function parseCallbackBody(raw: string): WfpCallback | null {
  const tryJson = (s: string) => {
    try {
      const v = JSON.parse(s);
      return v && typeof v === "object" ? (v as WfpCallback) : null;
    } catch {
      return null;
    }
  };
  const direct = tryJson(raw);
  if (direct) return direct;
  try {
    const params = new URLSearchParams(raw);
    for (const [k, v] of params) {
      const parsed = tryJson(v ? `${k}=${v}` : k) ?? tryJson(k);
      if (parsed) return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Скасувати регулярний платіж (потрібен пароль мерчанта). */
export async function removeRegularPayment(cfg: WfpConfig, orderReference: string): Promise<boolean> {
  if (!cfg.merchantPassword) return false;
  const res = await fetch(WFP_REGULAR_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requestType: "REMOVE",
      merchantAccount: cfg.merchantAccount,
      merchantPassword: cfg.merchantPassword,
      orderReference,
    }),
  });
  const data = (await res.json().catch(() => null)) as { reasonCode?: number } | null;
  return data?.reasonCode === 4100;
}
