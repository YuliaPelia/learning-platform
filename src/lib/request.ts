import "server-only";
import { headers } from "next/headers";

/** IP і браузер користувача — зберігаємо разом зі згодою як доказ. */
export async function requestMeta() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  return { ip, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
}
