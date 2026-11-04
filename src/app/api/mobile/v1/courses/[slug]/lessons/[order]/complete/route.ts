import { loadAccessibleLesson, recordLessonCompletion } from "@/lib/lesson-progress";
import { prisma } from "@/db";
import { apiError, requireMobileUser } from "@/lib/mobile/http";

/** Дитина завершила текстовий або відеоурок. Тест зараховується лише через /quiz. Ідемпотентно. */
export async function POST(request: Request, ctx: RouteContext<"/api/mobile/v1/courses/[slug]/lessons/[order]/complete">) {
  const auth = await requireMobileUser(request);
  if (!auth.user) return auth.response;
  if (auth.user.role !== "student") return apiError(403, "student_only", "Уроки проходить дитина зі свого акаунта");

  const { slug, order } = await ctx.params;
  const lesson = await prisma.lesson.findFirst({ where: { order: Number(order), course: { slug } }, select: { id: true } });
  if (!lesson) return apiError(404, "not_found", "Урок не знайдено");
  const loaded = await loadAccessibleLesson(auth.user.id, lesson.id);
  if (!loaded) return apiError(403, "locked", "Цей урок поки закритий");
  if (loaded.lesson.type === "quiz") return apiError(400, "bad_request", "Тест зараховується після відповідей");

  await recordLessonCompletion(auth.user.id, loaded, null);
  return Response.json({ completed: true, xp: loaded.lesson.xp });
}
