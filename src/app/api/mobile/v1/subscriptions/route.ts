import { prisma } from "@/db";
import { apiError, requireMobileUser } from "@/lib/mobile/http";
import { PLANS } from "@/lib/plans";

/** Підписки батьків (усі джерела): щоб показати стан і запропонувати обрати курс після покупки. */
export async function GET(request: Request) {
  const auth = await requireMobileUser(request);
  if (!auth.user) return auth.response;
  if (auth.user.role !== "parent") return apiError(403, "forbidden", "Підписки бачать батьки");

  const subs = await prisma.subscription.findMany({
    where: { userId: auth.user.id, status: { in: ["active", "past_due", "canceled"] } },
    include: { plan: true, course: { select: { slug: true } } },
    orderBy: { createdAt: "desc" },
  });
  return Response.json({
    subscriptions: subs.map((s) => ({
      id: s.id,
      childId: s.studentId,
      plan: s.plan.code,
      provider: s.provider,
      slot: s.slot,
      status: s.status,
      endsAt: s.endsAt,
      courseSlug: s.course?.slug ?? null,
      needsCourse: !PLANS[s.plan.code].allCourses && !s.courseId,
    })),
  });
}
