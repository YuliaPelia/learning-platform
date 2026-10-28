import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

/** Скільки діє код із листа. */
export const EMAIL_CODE_TTL_MS = 15 * 60 * 1000;
/** Пауза перед повторним листом на ту саму адресу. */
export const EMAIL_CODE_RESEND_MS = 60 * 1000;
/** Скільки хибних спроб дозволено, перш ніж код треба надіслати наново. */
export const EMAIL_CODE_MAX_ATTEMPTS = 5;

/** Шестизначний код. Випадковість криптографічна, не Math.random. */
export function generateEmailCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashEmailCode(code: string, secret: string) {
  return createHmac("sha256", secret).update(code).digest("hex");
}

/** Порівняння коду з HMAC у базі. Хибна довжина хешу — просто «не збігся», без винятку. */
export function emailCodeMatches(code: string, storedHash: string, secret: string) {
  const actual = Buffer.from(hashEmailCode(code, secret), "hex");
  const expected = Buffer.from(storedHash, "hex");
  if (actual.length === 0 || actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

/** Секрет той самий, що підписує мобільні токени: окремий ключ для кодів не заводимо. */
export function emailCodeSecret() {
  const secret = process.env.MOBILE_JWT_SECRET || process.env.SESSION_SECRET;
  if (!secret) throw new Error("Не задано MOBILE_JWT_SECRET");
  return secret;
}

/** Скільки секунд лишилось до повторного листа. 0 — уже можна. */
export function resendWaitSeconds(sentAt: Date, now = new Date()) {
  const left = EMAIL_CODE_RESEND_MS - (now.getTime() - sentAt.getTime());
  return left > 0 ? Math.ceil(left / 1000) : 0;
}

export function emailCodeLetter(code: string) {
  return {
    subject: "Код підтвердження ITCodeCraft",
    text: `Ваш код підтвердження: ${code}\n\nВін діє 15 хвилин. Якщо ви не створювали акаунт в ITCodeCraft, проігноруйте цей лист.`,
  };
}
