import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/db";
import type { Role } from "@/generated/prisma/enums";
import { readSession } from "./session";

/**
 * DAL (Data Access Layer) — єдине місце, де ми перевіряємо, хто користувач.
 * Кожна сторінка й дія з доступом до даних викликає ці функції.
 * `cache` — щоб у межах одного запиту не ходити в базу двічі.
 */
export const getCurrentUser = cache(async () => {
  const session = await readSession();
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId } });
});

/** Вимагає вхід (і, якщо вказано, конкретну роль). Інакше — на сторінку входу. */
export async function requireUser(...roles: Role[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles.length && !roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

export function homeFor(role: Role) {
  if (role === "parent") return "/cabinet/parent";
  if (role === "student") return "/cabinet/student";
  if (role === "teacher" || role === "admin") return "/teacher";
  return "/";
}

/** Діти цих батьків. */
export async function getChildren(parentId: string) {
  return prisma.user.findMany({ where: { parentId }, orderBy: { createdAt: "asc" } });
}
