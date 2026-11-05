import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/db";
import { completeLesson, requestUnlock, submitHomework, submitQuiz } from "@/actions/learning";
import { StatusBadge } from "@/components/cabinet-shell";
import { IconArrow, IconCheck, IconLock } from "@/components/icons";
import { MessageThread } from "@/components/message-thread";
import { Logo } from "@/components/site-chrome";
import { Mascot } from "@/components/mascot";
import { CompleteLessonButton, GatedVideo, WatchGateProvider } from "@/components/watch-gate";
import { requireUser } from "@/lib/dal";
import { formatShortDate } from "@/lib/format";
import { getCourseState } from "@/lib/learning";
import { QUIZ_PASS_RATIO, parseLessonContent } from "@/lib/lesson-content";
import { Markdown } from "@/lib/markdown";
import { mediaSrc, mediaSrcOrNull } from "@/lib/media";

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
  // Власне відео (mp4/webm) можна відстежити — тоді «Урок пройдено» лише після перегляду.
  // YouTube/Vimeo у вбудованому плеєрі не відстежити, тож для них обмеження немає.
  const isFileVideo = !!content.videoUrl && /\.(mp4|webm)(\?|$)/i.test(content.videoUrl);
  const nextItem = state.items[idx + 1];
  const prevItem = state.items[idx - 1];
  const doneCount = state.items.filter((it) => it.done).length;
  const coursePct = state.items.length ? Math.round((doneCount / state.items.length) * 100) : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 px-3 pt-3 md:px-6">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-4 rounded-full border border-white/80 bg-white/85 pr-2 pl-5 shadow-soft backdrop-blur-xl md:pl-7">
          <Logo small />
          <div className="hidden min-w-0 flex-1 items-center justify-center gap-3 md:flex" aria-label={`Прогрес курсу: ${doneCount} з ${state.items.length} уроків`}>
            <span className="truncate text-sm font-semibold text-soft">{state.course.title}</span>
            <div className="h-2 w-40 overflow-hidden rounded-full bg-surface-2" aria-hidden>
              <div className="bg-iris h-full rounded-full" style={{ width: `${coursePct}%` }} />
            </div>
            <span className="font-mono text-xs font-semibold text-muted">{doneCount}/{state.items.length}</span>
          </div>
          <Link href="/cabinet/student" className="btn-primary h-11 px-5">До кабінету</Link>
        </div>
      </header>

      {/* Навігація: назад до кабінету + де я зараз */}
      <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center gap-x-4 gap-y-3 px-4 pt-6 md:px-6">
        <Link href="/cabinet/student" className="icon-btn group" aria-label="Назад до кабінету" title="Назад до кабінету">
          <IconArrow size={16} className="rotate-180 transition-transform group-hover:-translate-x-0.5" />
        </Link>
        <nav aria-label="Ви тут" className="min-w-0 text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/cabinet/student" className="hover:text-text hover:underline">Мій кабінет</Link>
            </li>
            <li aria-hidden className="text-faint">›</li>
            <li>
              <Link href={`/courses/${slug}`} className="hover:text-text hover:underline">{state.course.title}</Link>
            </li>
            <li aria-hidden className="text-faint">›</li>
            <li aria-current="page" className="font-semibold text-text">Урок {lesson.order}</li>
          </ol>
        </nav>
      </div>

      <div className="mx-auto grid w-full max-w-[1240px] flex-1 gap-4 px-3 pt-5 pb-10 md:px-6 lg:grid-cols-[300px_1fr] lg:gap-5">
        {/* Список уроків курсу */}
        <nav aria-label="Уроки курсу" className="card flex flex-col gap-1 p-3 lg:sticky lg:top-24 lg:self-start">
          <Link href={`/courses/${slug}`} className="flex items-center justify-between gap-2 px-3 pt-2 pb-3 font-display text-lg font-extrabold hover:text-accent">
            {state.course.title}
            <span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-mono text-xs font-semibold text-muted">{coursePct}%</span>
          </Link>
          {state.items.map((it) => {
            const current = it.lesson.id === lesson.id;
            const open = it.access === "ok";
            return open ? (
              <Link
                key={it.lesson.id}
                href={`/learn/${slug}/${it.lesson.order}`}
                aria-current={current ? "page" : undefined}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors ${current ? "bg-surface-2 font-semibold text-text" : "text-soft hover:bg-surface-2/60"}`}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-sm ${it.done ? "bg-text text-white" : "bg-surface-2"}`}>
                  {it.done ? <IconCheck size={14} /> : it.lesson.order}
                </span>
                <span className="text-[15px]">{it.lesson.title}</span>
              </Link>
            ) : (
              <span key={it.lesson.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-faint">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line">
                  <IconLock size={14} />
                </span>
                <span className="text-[15px]">{it.lesson.title}</span>
              </span>
            );
          })}
        </nav>

        <article className="flex min-w-0 flex-col gap-4 lg:gap-5">
          <div className="bg-pearl relative flex flex-col gap-3 overflow-hidden rounded-(--radius-card) p-7 shadow-soft md:p-9">
            <div className="flex flex-wrap gap-2 text-sm font-semibold">
              <span className="rounded-full bg-white/80 px-3 py-1 text-soft">Урок {lesson.order} з {state.items.length}</span>
              <span className="rounded-full bg-text px-3 py-1 text-white">+{lesson.xp} XP</span>
            </div>
            <h1 className="relative z-10 max-w-[560px] font-display text-3xl font-extrabold md:text-[42px] md:leading-[1.1]">{lesson.title}</h1>
            <Mascot className="absolute -right-4 -bottom-8 hidden h-[190px] w-[240px] md:block" sizes="240px" />
          </div>

          {access === "ok" ? (
            <WatchGateProvider required={isFileVideo && !done}>
              {content.videoUrl && (
                <div className="aspect-video overflow-hidden rounded-(--radius-card) bg-text shadow-soft">
                  {isFileVideo ? (
                    <GatedVideo src={mediaSrc(content.videoUrl)} poster={mediaSrcOrNull(state.course.coverUrl) ?? undefined} title={lesson.title} />
                  ) : (
                    <iframe src={content.videoUrl} title={lesson.title} className="h-full w-full" allowFullScreen />
                  )}
                </div>
              )}
              {content.markdown && (
                <div className="card p-6 sm:p-8 md:p-10">
                  <Markdown source={content.markdown} />
                </div>
              )}

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
                        <label key={oi} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-transparent bg-surface-2 px-4 py-3 transition-colors hover:bg-line has-[:checked]:border-text has-[:checked]:bg-white">
                          <input type="radio" name={`q${qi}`} value={oi} required className="accent-[var(--color-text)]" />
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
                      <pre className="overflow-x-auto rounded-2xl bg-text p-4 font-mono text-sm text-[#e6e6ef]">{hw.answer}</pre>
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
              <form action={completeLesson} className="card flex flex-wrap items-center gap-4 p-4 pl-6">
                <input type="hidden" name="lessonId" value={lesson.id} />
                {done ? (
                  <>
                    <span className="flex items-center gap-2 font-semibold text-good">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-good/10"><IconCheck size={16} /></span> Урок пройдено
                    </span>
                    {nextItem?.access === "locked_homework" ? (
                      <Link href="#homework" className="font-semibold text-pink hover:underline">
                        Здай домашку — і відкриється наступний урок
                      </Link>
                    ) : (
                      nextItem && (
                        <Link href={`/learn/${slug}/${nextItem.lesson.order}`} className="btn-primary">
                          Наступний урок <IconArrow />
                        </Link>
                      )
                    )}
                  </>
                ) : (
                  <CompleteLessonButton>
                    Урок пройдено — далі <IconArrow />
                  </CompleteLessonButton>
                )}
              </form>
              )}
            </WatchGateProvider>
          ) : (
            <div className="card flex flex-col items-start gap-4 p-8">
              <IconLock size={32} className="text-amber" />
              {access === "locked_sequence" && (
                <>
                  <h2 className="text-2xl font-bold">Спочатку пройди попередній урок</h2>
                  <p className="text-soft">Уроки відкриваються крок за кроком — так знання складаються в систему.</p>
                  <Link href={`/learn/${slug}/${state.items[idx - 1]?.lesson.order ?? 1}`} className="btn-primary">До уроку {state.items[idx - 1]?.lesson.order ?? 1}</Link>
                </>
              )}
              {access === "locked_homework" && state.items[idx - 1] && (
                <>
                  <h2 className="text-2xl font-bold">Спочатку здай домашку попереднього уроку</h2>
                  <p className="text-soft">Щойно домашку буде здано, цей урок відкриється. Чекати перевірки викладача не потрібно.</p>
                  <Link href={`/learn/${slug}/${state.items[idx - 1].lesson.order}#homework`} className="btn-primary">До домашки</Link>
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
          {/* Перехід між уроками */}
          <nav aria-label="Перехід між уроками" className="flex flex-wrap items-center justify-between gap-3 pt-2 text-sm">
            {prevItem ? (
              <Link href={`/learn/${slug}/${prevItem.lesson.order}`} className="group flex max-w-full items-center gap-3 rounded-full bg-white py-2 pr-5 pl-2 text-soft shadow-pill hover:text-text">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2">
                <IconArrow size={16} className="shrink-0 rotate-180 transition-transform group-hover:-translate-x-0.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-muted">Попередній урок</span>
                  <span className="block truncate font-semibold">{prevItem.lesson.title}</span>
                </span>
              </Link>
            ) : (
              <span />
            )}
            <Link href={`/courses/${slug}`} className="chip">
              Усі уроки курсу
            </Link>
          </nav>
        </article>
      </div>
    </div>
  );
}
