import * as z from "zod";
import { prisma } from "@/db";
import { apiError, badRequest, readJson, requireMobileUser } from "@/lib/mobile/http";
import { PLANS, PLAN_RANK } from "@/lib/plans";

// Мобільний додаток оперує курсами за slug (як у /courses)
const Body = z.object({ courseSlug: z.string().min(1).max(100) });

/** Курс для тарифів «1 курс на вибір»: після покупки в магазині його обирають один раз (зміна — через підтримку). */
export async function POST(request: Request, ctx: RouteContext<"/api/mobile/v1/subscriptions/[id]/course">) {
  const auth = await requireMobileUser(request);
  if (!auth.user) return auth.response;
  if (auth.user.role !== "parent") return apiError(403, "forbidden", "Курс обирають батьки");

  const id = z.uuid().safeParse((await ctx.params).id);
  const body = Body.safeParse(await readJson(request));
  if (!id.success || !body.success) return badRequest();

  const sub = await prisma.subscription.findFirst({ where: { id: id.data, userId: auth.user.id }, include: { plan: true } });
  if (!sub) return apiError(404, "not_found", "Підписку не знайдено");
  if (PLANS[sub.plan.code].allCourses) return apiError(409, "not_applicable", "Тариф Преміум відкриває всі курси");
  if (sub.courseId) return apiError(409, "course_set", "Курс уже обрано. Щоб змінити, напишіть у підтримку.");

  const course = await prisma.course.findUnique({ where: { slug: body.data.courseSlug }, include: { minPlan: true } });
  if (!course || course.status !== "published") return apiError(400, "course_unavailable", "Цей курс ще недоступний");
  if (PLAN_RANK[sub.plan.code] < PLAN_RANK[course.minPlan.code]) return apiError(400, "plan_too_low", "Цей курс відкритий лише в тарифі Преміум");

  await prisma.subscription.update({ where: { id: sub.id }, data: { courseId: course.id } });
  return Response.json({ ok: true });
}
