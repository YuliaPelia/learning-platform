import "server-only";
import { importPKCS8, SignJWT } from "jose";
import { iapConfig } from "./config";
import { googleState } from "./mapping";
import { parseProductId } from "./products";
import { IapNotConfigured, IapRejected, type VerifiedSubscription } from "./types";

const SCOPE = "https://www.googleapis.com/auth/androidpublisher";

type ServiceAccount = { client_email: string; private_key: string };

/** OAuth-токен сервісного акаунта Google Play (JWT-bearer). */
async function accessToken(): Promise<string> {
  const raw = iapConfig().googleServiceAccount;
  if (!raw) throw new IapNotConfigured("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON не задано");
  const sa = JSON.parse(raw) as ServiceAccount;
  const key = await importPKCS8(sa.private_key, "RS256");
  const jwt = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  if (!res.ok) throw new IapNotConfigured("Google не видав токен доступу");
  return ((await res.json()) as { access_token: string }).access_token;
}

type GoogleSubscription = {
  subscriptionState?: string;
  testPurchase?: unknown;
  lineItems?: { productId?: string; expiryTime?: string }[];
};

/** Запитує Google Play про підписку за purchaseToken (subscriptionsv2) і перевіряє, що це наш товар. */
export async function verifyGoogle(purchaseToken: string, expectedProductId?: string): Promise<VerifiedSubscription> {
  const cfg = iapConfig();
  const token = await accessToken();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(cfg.packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404 || res.status === 400 || res.status === 410) throw new IapRejected("Покупку не знайдено в Google Play");
  if (!res.ok) throw new IapNotConfigured("Google Play тимчасово недоступний");
  const sub = (await res.json()) as GoogleSubscription;

  const item = sub.lineItems?.find((l) => l.productId && parseProductId(l.productId) && (!expectedProductId || l.productId === expectedProductId));
  if (!item?.productId || !item.expiryTime) throw new IapRejected("Невідомий товар");
  const sandbox = !!sub.testPurchase;
  if (sandbox && !cfg.allowSandbox) throw new IapRejected("Тестові покупки вимкнені");
  return {
    provider: "google",
    externalId: purchaseToken,
    productId: item.productId,
    expiresAt: new Date(item.expiryTime),
    state: googleState(sub.subscriptionState ?? ""),
    sandbox,
  };
}
