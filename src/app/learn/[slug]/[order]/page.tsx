import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/db";
import { completeLesson, requestUnlock, submitHomework, submitQuiz } from "@/actions/learning";
import { StatusBadge } from "@/components/cabinet-shell";
import { IconArrow, IconCheck, IconLock } from "@/components/icons";
import { MessageThread } from "@/components/message-thread";
import { Logo } from "@/components/site-chrome";
import { requireUser } from "@/lib/dal";
import { formatShortDate } from "@/lib/format";
import { getCourseState } from "@/lib/learning";
import { QUIZ_PASS_RATIO, parseLessonContent } from "@/lib/lesson-content";
import { Markdown } from "@/lib/markdown";

export const metadata: Metadata = { title: "Урок" };

export default async function LessonPage({ params, searchParams }: PageProps<"/learn/[slug]/[order]">) {
  const user = await requireUser();
  const { slug, order } = await params;
  const sp = await searchParams;
  if (user.role !== "student") redirect(`/courses/${slug}`);

  const state = await getCourseState(slug, user.id);
  if (!state) notFound();
  const idx = state.items.findIndex((i) => i.lesson.order === Number(order));
  if (idx === -1) notFound();
  const { lesson, done, access } = state.items[idx];

  const task = lesson.homework;
  const hw = task
    ? await prisma.submission.findUnique({
        where: { homeworkId_userId: { homeworkId: task.id, userId: user.id } },
        include: { messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true, role: true } } } } },
      })
    : null;
  const content = parseLessonContent(lesson.type, lesson.content);
  // ?quiz=2-3 — результат невдалої спроби тесту (правильних-усього)
  const quizResult = typeof sp.quiz === "string" ? sp.quiz.split("-").map(Number) : null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[#242955]">
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-4 md:px-6">
          <Logo small />
          <Link href="/cabinet/student" className="btn-ghost h-11">До кабінету</Link>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1200px] flex-1 gap-10 px-4 py-10 md:px-6 lg:grid-cols-[280px_1fr]">
        {/* Список уроків курсу */}
        <nav aria-label="Уроки курсу" className="flex flex-col gap-2 lg:sticky lg:top-6 lg:self-start">
          <Link href={`/courses/${slug}`} className="mb-2 font-display text-lg font-bold hover:text-accent">
            {state.course.title}
          </Link>
          {state.items.map((it) => {
            const current = it.lesson.id === lesson.id;
            const open = it.access === "ok";
            return open ? (
              <Link
                key={it.lesson.id}
                href={`/learn/${slug}/${it.lesson.order}`}
                aria-current={current ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${current ? "bg-surface-2 text-text" : "text-soft hover:bg-surface"}`}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-sm ${it.done ? "bg-accent text-ink" : "bg-line"}`}>
                  {it.done ? <IconCheck size={14} /> : it.lesson.order}
                </span>
                <span className="text-[15px]">{it.lesson.title}</span>
              </Link>
            ) : (
              <span key={it.lesson.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-faint">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface">
                  <IconLock size={14} />
                </span>
                <span className="text-[15px]">{it.lesson.title}</span>
              </span>
            );
          })}
        </nav>

        <article className="flex min-w-0 flex-col gap-8">
          <div className="flex flex-col gap-2">
            <span className="text-muted">
              Урок {lesson.order} з {state.items.length} · +{lesson.xp} XP
            </span>
            <h1 className="font-display text-3xl font-bold md:text-4xl">{lesson.title}</h1>
          </div>

          {access === "ok" ? (
            <>
              {content.videoUrl && (
                <div className="aspect-video overflow-hidden rounded-3xl bg-surface">
                  {/\.(mp4|webm)(\?|$)/i.test(content.videoUrl) ? (
                    <video src={content.videoUrl} controls controlsList="nodownload" className="h-full w-full" />
                  ) : (
                    <iframe src={content.videoUrl} title={lesson.title} className="h-full w-full" allowFullScreen />
                  )}
                </div>
              )}
              {content.markdown && <Markdown source={content.markdown} />}

              {lesson.type === "quiz" && (
                <form action={submitQuiz} className="card flex flex-col gap-6 p-7">
                  <input type="hidden" name="lessonId" value={lesson.id} />
                  <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold">Тест</h2>
                    <p className="text-sm text-muted">
                      Щоб пройти, потрібно щонайменше {Math.round(QUIZ_PASS_RATIO * 100)}% правильних відповідей.
                    </p>
                  </div>
                  {quizResult && !done && (
                    <p className="font-semibold text-amber">
                      Правильних відповідей: {quizResult[0]} з {quizResult[1]}. Спробуй ще раз!
                    </p>
                  )}
                  {content.questions.map((q, qi) => (
                    <fieldset key={qi} className="flex flex-col gap-2.5">
                      <legend className="mb-2 font-semibold">
                        {qi + 1}. {q.q}
                      </legend>
                      {q.options.map((opt, oi) => (
                        <label key={oi} className="flex cursor-pointer items-center gap-3 rounded-xl bg-ink px-4 py-3 hover:bg-[#141835]">
                          <input type="radio" name={`q${qi}`} value={oi} required className="accent-[var(--color-accent)]" />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </fieldset>
                  ))}
                  <button className="btn-primary self-start">{done ? "Пройти тест ще раз" : "Перевірити відповіді"}</button>
                </form>
              )}

              {task && (
                <section id="homework" className="card flex flex-col gap-4 p-7">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-xl font-bold">Домашнє завдання</h2>
                    {hw &&
                      (hw.status === "pending" ? (
                        <StatusBadge tone="wait">До {formatShortDate(hw.dueAt)}</StatusBadge>
                      ) : hw.status === "submitted" ? (
                        <StatusBadge tone="wait">На перевірці у викладача</StatusBadge>
                      ) : (
                        <StatusBadge tone="good">{hw.score != null ? `Оцінка ${hw.score}/${task.maxScore}` : "Зараховано"}</StatusBadge>
                      ))}
                  </div>
                  <p className="leading-relaxed text-soft">{task.task}</p>
                  {!hw ? (
                    <p className="text-muted">Домашка відкриється, коли ти позначиш урок пройденим.</p>
                  ) : hw.status === "pending" ? (
                    <form action={submitHomework} className="flex flex-col gap-3">
                      <input type="hidden" name="homeworkId" value={hw.id} />
                      <label htmlFor="answer" className="label">Твоя відповідь або код</label>
                      <textarea id="answer" name="answer" required rows={8} className="field h-auto py-3 font-mono text-[15px]" />
                      <button className="btn-primary self-start">Здати домашку</button>
                    </form>
                  ) : (
                    <>
                      <pre className="overflow-x-auto rounded-2xl bg-ink p-4 font-mono text-sm text-soft">{hw.answer}</pre>
                      {hw.teacherComment && <p className="leading-relaxed">Викладач: «{hw.teacherComment}»</p>}
                    </>
                  )}
                  {/* Листування з викладачем — лише там, де домашку перевіряє викладач (тариф Преміум) */}
                  {hw?.needsTeacher && (
                    <div className="flex flex-col gap-3 border-t border-line pt-5">
                      <h3 className="font-bold">Запитання до викладача</h3>
                      <MessageThread submissionId={hw.id} messages={hw.messages} viewerId={user.id} placeholder="Не виходить чи щось незрозуміло? Напиши викладачу…" />
                    </div>
                  )}
                </section>
              )}

              {(lesson.type !== "quiz" || done) && (
              <form action={completeLesson} className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
                <input type="hidden" name="lessonId" value={lesson.id} />
                {done ? (
                  <>
                    <span className="flex items-center gap-2 font-semibold text-accent">
                      <IconCheck /> Урок пройдено
                    </span>
                    {state.items[idx + 1] && (
                      <Link href={`/learn/${slug}/${state.items[idx + 1].lesson.order}`} className="btn-primary">
                        Наступний урок <IconArrow />
                      </Link>
                    )}
                  </>
                ) : (
                  <button className="btn-primary h-14 px-7 text-lg">
                    Урок пройдено — далі <IconArrow />
                  </button>
                )}
              </form>
              )}
            </>
          ) : (
            <div className="card flex flex-col items-start gap-4 p-8">
              <IconLock size={32} className="text-amber" />
              {access === "locked_sequence" && (
                <>
                  <h2 className="text-2xl font-bold">Спочатку пройди попередній урок</h2>
                  <p className="text-soft">Уроки відкриваються крок за кроком — так знання складаються в систему.</p>
                  <Link href={`/learn/${slug}/${lesson.order - 1}`} className="btn-primary">До уроку {lesson.order - 1}</Link>
                </>
              )}
              {access === "coming_soon" && <h2 className="text-2xl font-bold">Курс ще готується — скоро відкриємо!</h2>}
              {access === "needs_subscription" && (
                <>
                  <h2 className="text-2xl font-bold">Безкоштовні уроки пройдено! 🎉</h2>
                  <p className="text-soft">Щоб продовжити, попроси батьків відкрити курс — ми надішлемо їм лист. Твій прогрес збережено.</p>
                  {sp.asked ? (
                    <p className="font-semibold text-accent">Лист батькам надіслано ✔</p>
                  ) : (
                    <form action={requestUnlock}>
                      <input type="hidden" name="courseTitle" value={state.course.title} />
                      <input type="hidden" name="back" value={`/learn/${slug}/${lesson.order}`} />
                      <button className="btn-primary">Попросити батьків відкрити курс</button>
                    </form>
                  )}
                </>
              )}
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
