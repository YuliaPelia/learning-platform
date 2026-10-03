import bcrypt from "bcryptjs";
import { scryptSync, timingSafeEqual } from "node:crypto";

/** Хеш пароля для нових акаунтів (bcrypt). */
export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

/**
 * Перевірка пароля. Підтримує bcrypt ("$2...") і старий формат "salt:hash" (scrypt),
 * яким заповнювала базу перша версія seed у prisma-practice.
 */
export async function verifyPassword(password: string, stored: string) {
  if (stored.startsWith("$2")) return bcrypt.compare(password, stored);
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
