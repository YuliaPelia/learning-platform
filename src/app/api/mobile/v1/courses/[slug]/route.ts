import type { NextRequest } from "next/server";
import { FREE_LESSONS } from "@/lib/plans";
import { getCourseState } from "@/lib/learning";
import { apiError, getMobileUser } from "@/lib/mobile/http";

/**
 * Курс і його теми. Теми бачать усі, а чи відкритий урок — залежить від того, хто питає:
 *  - гість: access = "login_required" (теми видно, відкрити можна після входу);
 *  - батько: access = "student_only" (уроки проходить дитина);
 *  - дитина: реальний стан за правилами доступу (2 безкоштовні уроки, підписка, послідовність).
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/mobile/v1/courses/[slug]">) {
  const { slug } = await ctx.params;
  const user = await getMobileUser(request);
  const student = user?.role === "student" ? user : null;

  const state = await getCourseState(slug, student?.id ?? null);
  if (!state) return apiError(404, "not_found", "Курс не знайдено");

  const { course } = state;
  return Response.json({
    course: {
      slug: course.slug,
      title: course.title,
      description: course.description,
      category: course.category,
      ageFrom: course.ageFrom,
      ageTo: course.ageTo,
      status: course.status,
      freeLessons: FREE_LESSONS,
      completedCount: student ? state.completedCount : null,
    },
    lessons: state.items.map(({ lesson, done, access }) => ({
      order: lesson.order,
      title: lesson.title,
      summary: lesson.summary,
      type: lesson.type,
      xp: lesson.xp,
      free: lesson.order <= FREE_LESSONS,
      done: student ? done : false,
      access: student ? access : user ? "student_only" : "login_required",
    })),
  });
}
