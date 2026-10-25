import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { verifyAccessToken } from "./tokens";

/** Єдиний формат помилок API: { error: { code, message } }. */
export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Тіло запиту як JSON-об'єкт; усе інше — null (викликач відповість 400). */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const badRequest = (message = "Некоректний запит") => apiError(400, "bad_request", message);

/** Мобільний додаток — для батьків і дітей; викладачі й адміни працюють у вебі. */
export const MOBILE_ROLES = ["parent", "student"] as const;

export function publicUser(u: { id: string; name: string; role: string; email: string | null; login: string; birthYear: number | null; parentId?: string | null }) {
  // hasParent: профіль учня створили батьки — видаляти його можуть лише вони
  return { id: u.id, name: u.name, role: u.role, email: u.email, login: u.login, birthYear: u.birthYear, hasParent: !!u.parentId };
}

/** Користувач за заголовком Authorization: Bearer <access>. null — немає або недійсний токен. */
export async function getMobileUser(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  const userId = await verifyAccessToken(token);
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user && !user.deletedAt && (MOBILE_ROLES as readonly string[]).includes(user.role) ? user : null;
}

/** Для захищених ендпоінтів: або користувач, або готова відповідь 401. */
export async function requireMobileUser(request: Request) {
  const user = await getMobileUser(request);
  return user
    ? ({ user, response: null } as const)
    : ({ user: null, response: apiError(401, "unauthorized", "Потрібен вхід") } as const);
}
