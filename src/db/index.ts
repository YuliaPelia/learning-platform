import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Один клієнт (і пул з'єднань) на весь сервер. У режимі розробки Next.js перезавантажує
// модулі, тому зберігаємо клієнт у globalThis, щоб не відкривати сотні з'єднань.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
