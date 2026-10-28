import "server-only";
import { Environment, SignedDataVerifier, VerificationException, VerificationStatus } from "@apple/app-store-server-library";
import { APPLE_ROOT_CERTS_BASE64 } from "./apple-roots";
import { iapConfig } from "./config";
import { IapNotConfigured, IapRejected, type VerifiedSubscription } from "./types";
import { parseProductId } from "./products";

const roots = () => APPLE_ROOT_CERTS_BASE64.map((b) => Buffer.from(b, "base64"));

function verifierFor(env: Environment) {
  const cfg = iapConfig();
  // Для Production Apple вимагає числовий id застосунку (App Store Connect → Інформація про застосунок)
  if (env === Environment.PRODUCTION && !cfg.appleAppId) throw new IapNotConfigured("APPLE_APP_ID не задано");
  return new SignedDataVerifier(roots(), true, env, cfg.bundleId, cfg.appleAppId);
}

/** Спершу Production, а якщо підпис із Sandbox (TestFlight, тестові покупки) і це дозволено — Sandbox. */
async function withEnvironments<T>(run: (v: SignedDataVerifier, sandbox: boolean) => Promise<T>): Promise<T> {
  try {
    return await run(verifierFor(Environment.PRODUCTION), false);
  } catch (e) {
    const wrongEnv = e instanceof VerificationException && e.status === VerificationStatus.INVALID_ENVIRONMENT;
    if (!wrongEnv || !iapConfig().allowSandbox) throw e;
    return run(verifierFor(Environment.SANDBOX), true);
  }
}

type Tx = { originalTransactionId?: string; productId?: string; expiresDate?: number; revocationDate?: number; type?: string };

function toVerified(tx: Tx, sandbox: boolean, state: VerifiedSubscription["state"]): VerifiedSubscription {
  if (!tx.originalTransactionId || !tx.productId || !tx.expiresDate) throw new IapRejected("Неповні дані транзакції");
  if (tx.type && tx.type !== "Auto-Renewable Subscription") throw new IapRejected("Це не підписка");
  if (!parseProductId(tx.productId)) throw new IapRejected("Невідомий товар");
  return {
    provider: "apple",
    externalId: tx.originalTransactionId,
    productId: tx.productId,
    expiresAt: new Date(tx.expiresDate),
    state: tx.revocationDate ? "revoked" : state,
    sandbox,
  };
}

/** Перевіряє підписану транзакцію StoreKit 2 (JWS) за кореневими сертифікатами Apple. */
export async function verifyApple(signedTransaction: string): Promise<VerifiedSubscription> {
  try {
    return await withEnvironments(async (v, sandbox) => {
      const tx = await v.verifyAndDecodeTransaction(signedTransaction);
      return toVerified(tx, sandbox, tx.expiresDate && tx.expiresDate > Date.now() ? "active" : "expired");
    });
  } catch (e) {
    if (e instanceof IapNotConfigured || e instanceof IapRejected) throw e;
    throw new IapRejected("Підпис транзакції недійсний");
  }
}

/** Серверне сповіщення App Store V2: перевіряє підпис і повертає тип, підтип і стан підписки. */
export async function decodeAppleNotification(signedPayload: string) {
  try {
    return await withEnvironments(async (v, sandbox) => {
      const n = await v.verifyAndDecodeNotification(signedPayload);
      const txJws = n.data?.signedTransactionInfo;
      const tx = txJws ? await v.verifyAndDecodeTransaction(txJws) : null;
      return { type: String(n.notificationType ?? ""), subtype: n.subtype ? String(n.subtype) : undefined, tx, sandbox, toVerified: (state: VerifiedSubscription["state"]) => (tx ? toVerified(tx, sandbox, state) : null) };
    });
  } catch (e) {
    if (e instanceof IapNotConfigured) throw e;
    throw new IapRejected("Підпис сповіщення недійсний");
  }
}
