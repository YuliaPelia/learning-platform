import { prisma } from "@/db";
import { STATS_DAYS, bucketByDay, deltaPercent, sumPoints } from "./stats-utils";

export { STATS_DAYS };
export type { DayPoint } from "./stats-utils";

const DAY_MS = 86_400_000;

export async function getSiteStats(now = new Date()) {
  const since = new Date(now.getTime() - STATS_DAYS * DAY_MS);
  const sincePrev = new Date(now.getTime() - 2 * STATS_DAYS * DAY_MS);

  const [
    usersByRole,
    newUsers,
    activeSubs,
    subsByPlan,
    plans,
    payments,
    completedRows,
    homeworkByStatus,
    teacherQueue,
    courses,
    lessonsTotal,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.subscription.aggregate({ where: { status: "active" }, _count: { _all: true }, _sum: { amount: true } }),
    prisma.subscription.groupBy({ by: ["planId"], where: { status: "active" }, _count: { _all: true } }),
    prisma.plan.findMany({ orderBy: { rank: "asc" }, select: { id: true, name: true } }),
    prisma.payment.findMany({
      where: { status: "approved", paidAt: { gte: sincePrev } },
      select: { paidAt: true, amount: true },
    }),
    prisma.progress.findMany({
      where: { completed: true },
      select: { userId: true, completedAt: true, lesson: { select: { courseId: true } } },
    }),
    prisma.submission.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.submission.count({ where: { status: "submitted", needsTeacher: true } }),
    prisma.course.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, title: true, status: true, _count: { select: { lessons: true } } },
    }),
    prisma.lesson.count(),
  ]);

  const paymentPoints = payments.map((p) => ({ at: p.paidAt, value: p.amount }));
  const revenueSeries = bucketByDay(paymentPoints);
  const revenuePrev = payments.filter((p) => p.paidAt && p.paidAt < since).reduce((a, p) => a + p.amount, 0);
  const revenueNow = sumPoints(revenueSeries);

  const completedSeries = bucketByDay(completedRows.map((r) => ({ at: r.completedAt })));
  const registrationsSeries = bucketByDay(newUsers.map((u) => ({ at: u.createdAt })));

  const perCourse = new Map<string, { completions: number; learners: Set<string> }>();
  for (const r of completedRows) {
    const e = perCourse.get(r.lesson.courseId) ?? { completions: 0, learners: new Set<string>() };
    e.completions++;
    e.learners.add(r.userId);
    perCourse.set(r.lesson.courseId, e);
  }

  const roleCount = (role: string) => usersByRole.find((r) => r.role === role)?._count._all ?? 0;
  const hw = (status: string) => homeworkByStatus.find((h) => h.status === status)?._count._all ?? 0;

  return {
    users: {
      total: usersByRole.reduce((a, r) => a + r._count._all, 0),
      parents: roleCount("parent"),
      students: roleCount("student"),
      teachers: roleCount("teacher"),
      new30: sumPoints(registrationsSeries),
    },
    subscriptions: {
      active: activeSubs._count._all,
      mrr: activeSubs._sum.amount ?? 0,
      byPlan: plans.map((p) => ({ name: p.name, count: subsByPlan.find((s) => s.planId === p.id)?._count._all ?? 0 })),
    },
    revenue: { last30: revenueNow, delta: deltaPercent(revenueNow, revenuePrev) },
    learning: {
      lessonsTotal,
      completedTotal: completedRows.length,
      completed30: sumPoints(completedSeries),
      activeLearners: new Set(completedRows.map((r) => r.userId)).size,
    },
    homework: { pending: hw("pending"), submitted: hw("submitted"), reviewed: hw("reviewed"), teacherQueue },
    courses: courses
      .map((c) => ({
        id: c.id,
        title: c.title,
        published: c.status === "published",
        lessons: c._count.lessons,
        completions: perCourse.get(c.id)?.completions ?? 0,
        learners: perCourse.get(c.id)?.learners.size ?? 0,
      }))
      .sort((a, b) => b.completions - a.completions),
    series: { revenue: revenueSeries, completed: completedSeries, registrations: registrationsSeries },
  };
}
