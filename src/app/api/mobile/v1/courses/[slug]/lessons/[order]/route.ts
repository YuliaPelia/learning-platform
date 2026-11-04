import { prisma } from "@/db";
import { getCourseState } from "@/lib/learning";
import { parseLessonContent } from "@/lib/lesson-content";
import { apiError, requireMobileUser } from "@/lib/mobile/http";

/** Вбудовані плеєри (YouTube/Vimeo) у застосунку не програти — їх відкриваємо в браузері. */
const isFile = (url: string) => /\.(mp4|webm|m3u8|mov)(\?|$)/i.test(url);

/**
 * Зміст уроку для дитини: відео, текст (markdown), питання тесту БЕЗ правильних відповідей, домашка.
 * Доступ перевіряється так само, як у вебі; закритий урок віддає 403 з причиною.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/mobile/v1/courses/[slug]/lessons/[order]">) {
  const auth = await requireMobileUser(request);
  if (!auth.user) return auth.response;
  if (auth.user.role !== "student") return apiError(403, "student_only", "Уроки проходить дитина зі свого акаунта");

  const { slug, order } = await ctx.params;
  const n = Number(order);
  const state = await getCourseState(slug, auth.user.id);
  if (!state) return apiError(404, "not_found", "Курс не знайдено");
  const idx = state.items.findIndex((i) => i.lesson.order === n);
  if (idx === -1) return apiError(404, "not_found", "Урок не знайдено");

  const { lesson, done, access } = state.items[idx];
  if (access !== "ok") return apiError(403, access, "Цей урок поки закритий");

  const content = parseLessonContent(lesson.type, lesson.content);
  const hw = lesson.homework
    ? await prisma.submission.findUnique({
        where: { homeworkId_userId: { homeworkId: lesson.homework.id, userId: auth.user.id } },
        select: { status: true },
      })
    : null;
  const next = state.items[idx + 1];

  return Response.json({
    lesson: {
      order: lesson.order,
      title: lesson.title,
      summary: lesson.summary,
      type: lesson.type,
      xp: lesson.xp,
      done,
      total: state.items.length,
      markdown: content.markdown,
      video: content.videoUrl ? { url: content.videoUrl, kind: isFile(content.videoUrl) ? "file" : "embed" } : null,
      questions: content.questions.map(({ q, options }) => ({ q, options })),
      homework: lesson.homework ? { task: lesson.homework.task, status: hw?.status ?? null } : null,
      next: next && next.access === "ok" ? next.lesson.order : null,
      course: { slug: state.course.slug, title: state.course.title },
    },
  });
}
