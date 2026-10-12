import "server-only";
import { prisma } from "@/db";

/**
 * Обмеження невдалих входів. Лічильники лежать у БД (таблиця login_attempts),
 * а не в пам'яті процесу — тому працює і на serverless, де інстансів багато.
 */
export const LOGIN_LIMITS = {
  /** Невдалих спроб за одним логіном до блокування */
  maxPerLogin: 5,
  /** Невдалих спроб з однієї IP до блокування (вище — бо за NAT може бути багато людей) */
  maxPerIp: 20,
  /** Вікно, за яке рахуємо спроби */
  windowMs: 15 * 60 * 1000,
  /** Тривалість блокування */
  lockMs: 15 * 60 * 1000,
} as const;

/** Нормалізація й обрізання — ключ є PK, довгий рядок ламає btree-індекс. */
const norm = (v: string, max: number) => v.normalize("NFKC").trim().toLowerCase().slice(0, max);
export const loginKey = (login: string) => `login:${norm(login, 100)}`;
export const ipKey = (ip: string) => `ip:${norm(ip, 64)}`;

/** Скільки хвилин лишилось до розблокування (0 — не заблоковано). */
export async function lockedMinutes(keys: string[], now = new Date()): Promise<number> {
  const rows = await prisma.loginAttempt.findMany({ where: { key: { in: keys } } });
  let maxMs = 0;
  for (const r of rows) {
    if (r.lockedUntil && r.lockedUntil > now) maxMs = Math.max(maxMs, r.lockedUntil.getTime() - now.getTime());
  }
  return maxMs ? Math.ceil(maxMs / 60000) : 0;
}

/** Записує невдалу спробу; при досягненні ліміту ставить блокування. */
export async function recordFailure(key: string, max: number, now = new Date()) {
  const row = await prisma.loginAttempt.findUnique({ where: { key } });
  const expired = !row || now.getTime() - row.windowStart.getTime() > LOGIN_LIMITS.windowMs;
  // Вікно спливло — починаємо лічити заново (атомарний інкремент для живого вікна)
  const updated = expired
    ? await prisma.loginAttempt.upsert({
        where: { key },
        create: { key, failures: 1, windowStart: now },
        update: { failures: 1, windowStart: now, lockedUntil: null },
      })
    : await prisma.loginAttempt.update({ where: { key }, data: { failures: { increment: 1 } } });
  if (updated.failures >= max) {
    await prisma.loginAttempt.update({
      where: { key },
      data: { lockedUntil: new Date(now.getTime() + LOGIN_LIMITS.lockMs) },
    });
  }
}

/** Успішний вхід скидає лічильник цього логіна. */
export async function resetFailures(key: string) {
  await prisma.loginAttempt.deleteMany({ where: { key } });
}

/** Видаляє протерміновані рядки (вікно спливло й блокування знято). Викликається з cron. */
export async function deleteExpiredAttempts(now = new Date()) {
  const res = await prisma.loginAttempt.deleteMany({
    where: {
      windowStart: { lt: new Date(now.getTime() - LOGIN_LIMITS.windowMs) },
      OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
    },
  });
  return res.count;
}

export function lockedMessage(minutes: number) {
  return `Забагато невдалих спроб входу. Спробуйте за ${minutes} хв.`;
}
