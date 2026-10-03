/**
 * lessons.content — це JSON, структура якого залежить від типу уроку (див. prisma/schema.prisma).
 * Тут перетворюємо його на зрозумілий для сторінки вигляд і не довіряємо формі даних наосліп.
 */
import type { LessonType } from "@/generated/prisma/enums";

export type QuizQuestion = { q: string; options: string[]; answer: number };

export type LessonContent = {
  markdown: string;
  videoUrl: string | null;
  questions: QuizQuestion[];
};

/** Мінімальна частка правильних відповідей, щоб тест зарахувався. */
export const QUIZ_PASS_RATIO = 0.6;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseLessonContent(type: LessonType, content: unknown): LessonContent {
  const c = isRecord(content) ? content : {};
  const markdown = typeof c.markdown === "string" ? c.markdown : "";
  const videoUrl = type === "video" && typeof c.url === "string" ? c.url : null;
  const questions =
    type === "quiz" && Array.isArray(c.questions)
      ? c.questions.filter(
          (q): q is QuizQuestion =>
            isRecord(q) &&
            typeof q.q === "string" &&
            Array.isArray(q.options) &&
            q.options.every((o) => typeof o === "string") &&
            typeof q.answer === "number",
        )
      : [];
  return { markdown, videoUrl, questions };
}

/** Скільки відповідей правильні. answers[i] — індекс обраного варіанта (або -1). */
export function gradeQuiz(questions: QuizQuestion[], answers: number[]) {
  const correct = questions.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
  const total = questions.length;
  return { correct, total, passed: total === 0 || correct / total >= QUIZ_PASS_RATIO };
}
