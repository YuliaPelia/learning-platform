import { getChildren } from "@/lib/dal";
import { getStudentOverview } from "@/lib/learning";
import { requireMobileUser } from "@/lib/mobile/http";

/**
 * Статистика навчання. Однаковий формат для обох ролей:
 *  - дитина отримує себе одну;
 *  - батько — кожну свою дитину (порожній список, якщо профілів ще немає).
 */
export async function GET(request: Request) {
  const auth = await requireMobileUser(request);
  if (!auth.user) return auth.response;

  const students = auth.user.role === "student" ? [auth.user] : await getChildren(auth.user.id);
  const result = await Promise.all(
    students.map(async (s) => {
      const o = await getStudentOverview(s.id);
      const done = o.homework.filter((h) => h.status !== "pending").length;
      return {
        id: s.id,
        name: s.name,
        stats: {
          xp: o.xp,
          level: { level: o.level.level, title: o.level.title, progress: o.level.progress, toNext: o.level.toNext },
          streak: o.streak,
          week: o.week,
          lessonsCompleted: o.lessonsCompleted,
          lessonsThisWeek: o.lessonsThisWeek,
          homework: { total: o.homework.length, done },
          // Бейджі — частина тарифів Середній і Преміум, як у веб-кабінеті
          badges: o.badgesEnabled ? o.badges.map(({ id, title, earned }) => ({ id, title, earned })) : null,
          currentCourse: o.currentCourse ? { slug: o.currentCourse.slug, title: o.currentCourse.title } : null,
        },
      };
    }),
  );
  return Response.json({ students: result });
}
