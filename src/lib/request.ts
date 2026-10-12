import "server-only";
import { headers } from "next/headers";

/**
 * Чи довіряємо заголовкам x-forwarded-for / x-real-ip. Їх може підробити будь-який клієнт,
 * якщо перед застосунком немає проксі, що їх перезаписує. Тому довіра — лише явна:
 * TRUST_PROXY_HEADERS=1 (або автоматично на Vercel, де платформа сама перезаписує ці заголовки).
 */
export function trustProxyHeaders(env: Record<string, string | undefined> = process.env) {
  if (env.TRUST_PROXY_HEADERS === "1") return true;
  if (env.TRUST_PROXY_HEADERS === "0") return false;
  return Boolean(env.VERCEL);
}

/** IP клієнта або null, якщо його не можна визначити надійно. */
export function clientIpFrom(h: { get(name: string): string | null }, trust = trustProxyHeaders()): string | null {
  if (!trust) return null;
  // Останнє значення дописав найближчий довірений проксі; перші можуть бути підроблені клієнтом
  const forwarded = h.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return forwarded || h.get("x-real-ip")?.trim() || null;
}

/** IP клієнта для ліміту входів: null — невідомий (ліміт за IP не застосовуємо). */
export async function clientIp() {
  return clientIpFrom(await headers());
}

/** IP і браузер користувача — зберігаємо разом зі згодою як доказ. */
export async function requestMeta() {
  const h = await headers();
  const ip = clientIpFrom(h);
  return { ip: ip ?? "unknown", userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
}
