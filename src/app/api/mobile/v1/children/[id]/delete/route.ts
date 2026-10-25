import type { NextRequest } from "next/server";
import { prisma } from "@/db";
import { deleteStudentProfile } from "@/lib/account";
import { apiError, badRequest, readJson, requireMobileUser } from "@/lib/mobile/http";
import { ChildIdSchema } from "@/lib/validation";

/** Батьки видаляють профіль своєї дитини з додатку — так само, як у кабінеті на сайті. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/mobile/v1/children/[id]/delete">) {
  const auth = await requireMobileUser(request);
  if (!auth.user) return auth.response;
  if (auth.user.role !== "parent") return apiError(403, "forbidden", "Профіль дитини видаляють батьки");

  const parsed = ChildIdSchema.safeParse((await ctx.params).id);
  const body = await readJson(request);
  if (!parsed.success || body?.confirm !== true) return badRequest();

  // Чужу дитину не видаляємо й не підтверджуємо, що вона існує
  const child = await prisma.user.findFirst({ where: { id: parsed.data, parentId: auth.user.id }, select: { id: true } });
  if (!child) return apiError(404, "not_found", "Профіль не знайдено");

  const res = await deleteStudentProfile(child.id);
  if (!res.ok) return apiError(409, "cannot_delete", res.error);
  return new Response(null, { status: 204 });
}
