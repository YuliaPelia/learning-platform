import { prisma } from "@/db";
import { gradeQuiz, parseLessonContent } from "@/lib/lesson-content";
import { loadAccessibleLesson, recordLessonCompletion, recordQuizFailure } from "@/lib/lesson-progress";
import { apiError, badRequest, readJson, requireMobileUser } from "@/lib/mobile/http";

/** Тест: { answers: number[] } — індекси обраних варіантів. Бали рахуємо на сервері. */
export async function POST(request: Request, ctx: RouteContext<"/api/mobile/v1/courses/[slug]/lessons/[order]/quiz">) {
  const auth = await requireMobileUser(request);
  if (!auth.user) return auth.response;
  if (auth.user.role !== "student") return apiError(403, "student_only", "Уроки проходить дитина зі свого акаунта");

  const body = await readJson(request);
  if (!body || !Array.isArray(body.answers) || body.answers.length > 100) return badRequest();
  const answers = body.answers.map((v) => (Number.isInteger(v) ? (v as number) : -1));

  const { slug, order } = await ctx.params;
  const lesson = await prisma.lesson.findFirst({ where: { order: Number(order), course: { slug } }, select: { id: true } });
  if (!lesson) return apiError(404, "not_found", "Урок не знайдено");
  const loaded = await loadAccessibleLesson(auth.user.id, lesson.id);
  if (!loaded) return apiError(403, "locked", "Цей урок поки закритий");
  if (loaded.lesson.type !== "quiz") return badRequest("Це не тест");

  const { questions } = parseLessonContent(loaded.lesson.type, loaded.lesson.content);
  const result = gradeQuiz(questions, questions.map((_, i) => answers[i] ?? -1));
  const score = result.total ? Math.round((result.correct / result.total) * 100) : 100;

  if (result.passed) await recordLessonCompletion(auth.user.id, loaded, score);
  else await recordQuizFailure(auth.user.id, loaded.lesson.id, score);

  return Response.json({ correct: result.correct, total: result.total, passed: result.passed, score, xp: result.passed ? loaded.lesson.xp : 0 });
}
