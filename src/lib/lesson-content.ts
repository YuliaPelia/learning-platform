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

/**
 * Посилання на відео, яке вставив адмін → адреса, яку можна показати на сторінці уроку.
 * Звичайні посилання YouTube/Vimeo перетворюємо на embed-адреси; .mp4/.webm лишаємо як є.
 * Повертає null, якщо це не https-посилання.
 */
export function normalizeVideoUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^www\./, "");
  const id = /^[\w-]{6,20}$/;
  if (host === "youtu.be") {
    const v = url.pathname.slice(1);
    return id.test(v) ? `https://www.youtube.com/embed/${v}` : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    const v = url.pathname === "/watch" ? url.searchParams.get("v") : url.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/)?.[1];
    return v && id.test(v) ? `https://www.youtube.com/embed/${v}` : null;
  }
  if (host === "vimeo.com") {
    const v = url.pathname.match(/^\/(\d+)/)?.[1];
    return v ? `https://player.vimeo.com/video/${v}` : null;
  }
  return url.toString();
}
