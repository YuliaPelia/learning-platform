import type { Metadata } from "next";
import Link from "next/link";
import { CabinetShell, Notice, StatusBadge } from "@/components/cabinet-shell";
import { IconCheck, IconFlame, IconLock, IconPlay, IconStar } from "@/components/icons";
import { requireUser } from "@/lib/dal";
import { formatShortDate, pluralDays } from "@/lib/format";
import { getCourseState, getStudentOverview } from "@/lib/learning";

export const metadata: Metadata = { title: "Мій кабінет" };

const NAV = [
  { href: "/cabinet/student", label: "Навчання" },
  { href: "/cabinet/student#homework", label: "Домашки" },
  { href: "/cabinet/student#badges", label: "Досягнення" },
  { href: "/cabinet/student#courses", label: "Усі курси" },
];

export default async function StudentCabinet({ searchParams }: PageProps<"/cabinet/student">) {
  const student = await requireUser("student");
  const sp = await searchParams;
  const o = await getStudentOverview(student.id);
  const state = o.currentCourse ? await getCourseState(o.currentCourse.slug, student.id) : null;
  const nextItem = state?.items.find((i) => !i.done) ?? null;
  const published = o.allCourses.filter((c) => c.status === "published");
  const now = new Date();

  return (
    <CabinetShell nav={NAV} user={student} roleLabel="Учень">
      {sp.asked && <Notice tone="success">Ми надіслали батькам лист із проханням відкрити курс 🙌</Notice>}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-3xl font-bold">Привіт, {student.name}!</h1>
          <p className="text-[17px] text-muted">
            {o.level.nextXp ? `До наступного рівня лишилось ${o.level.toNext} XP` : "Ти досяг максимального рівня!"}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex h-12 items-center gap-2 rounded-2xl bg-[#2a2340] px-4 font-bold text-amber">
            <IconFlame /> {pluralDays(o.streak)} поспіль
          </div>
          <div className="flex h-12 items-center gap-2.5 rounded-2xl bg-surface-2 px-4 font-bold">
            Рівень {o.level.level}
            <div className="h-2 w-[90px] overflow-hidden rounded bg-line" role="progressbar" aria-valuenow={Math.round(o.level.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Прогрес до наступного рівня">
              <div className="h-2 bg-accent" style={{ width: `${Math.round(o.level.progress * 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Продовжити навчання */}
        <section className="card flex flex-col gap-5.5 p-8 xl:col-span-2">
          {state && o.currentCourse ? (
            <>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm text-muted">Курс · {o.currentCourse.title}</span>
                  <h2 className="font-display text-2xl font-bold">
                    {nextItem ? `Урок ${nextItem.lesson.order} · ${nextItem.lesson.title}` : "Курс пройдено! 🎉"}
                  </h2>
                </div>
                {nextItem && (
                  <Link href={`/learn/${o.currentCourse.slug}/${nextItem.lesson.order}`} className="btn-primary h-[52px] shrink-0 px-6 text-[17px]">
                    {state.completedCount ? "Продовжити" : "Почати"} <IconPlay />
                  </Link>
                )}
              </div>
              <ol className="flex flex-wrap items-center gap-y-3" aria-label="Шлях уроків">
                {state.items.map((it, idx) => {
                  const current = it === nextItem;
                  return (
                    <li key={it.lesson.id} className="flex items-center">
                      <span
                        className={`flex h-11 w-11 items-center justify-center rounded-full font-mono font-bold ${
                          it.done ? "bg-accent text-ink" : current ? "border-2 border-accent text-accent" : "bg-surface-2 text-faint"
                        }`}
                        title={it.lesson.title}
                      >
                        {it.done ? <IconCheck size={18} /> : it.access === "needs_subscription" ? <IconLock size={16} /> : it.lesson.order}
                        <span className="sr-only">
                          {it.done ? "пройдено" : current ? "поточний" : it.access === "needs_subscription" ? "потрібна підписка" : "ще попереду"}
                        </span>
                      </span>
                      {idx < state.items.length - 1 && <span className={`h-[3px] w-8 md:w-11 ${it.done ? "bg-accent" : "bg-line"}`} />}
                    </li>
                  );
                })}
              </ol>
              <div className="flex flex-col justify-between gap-1 text-sm text-muted sm:flex-row">
                <span>
                  {state.completedCount} з {state.items.length} уроків пройдено
                </span>
                {!state.hasSubscription && <span>Перші 2 уроки — безкоштовно, далі потрібна підписка</span>}
              </div>
            </>
          ) : (
            <p className="text-soft">Обери курс нижче, щоб почати навчання.</p>
          )}
        </section>

        {/* Бейджі */}
        <section id="badges" className="card flex flex-col gap-4 p-7">
          <h2 className="text-[19px] font-bold">Мої бейджі</h2>
          {o.badgesEnabled ? (
            <div className="grid grid-cols-2 gap-3">
              {o.badges.map((b) => (
                <div
                  key={b.id}
                  className={`flex flex-col gap-1.5 rounded-2xl p-3.5 ${b.earned ? "bg-[#2a2340]" : "border border-dashed border-line-2 bg-[#1a1e3a]"}`}
                  title={b.description}
                >
                  {b.earned ? <IconStar size={24} className="text-amber" /> : <IconLock size={24} className="text-faint" />}
                  <span className={`text-sm font-semibold ${b.earned ? "" : "text-[#8c91bc]"}`}>{b.title}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="leading-relaxed text-muted">
              Бейджі, рівні та сертифікати відкриваються в тарифах <b className="text-text">Середній</b> і <b className="text-text">Преміум</b>. Попроси
              батьків — а поки прогрес зберігається!
            </p>
          )}
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Домашки */}
        <section id="homework" className="card flex flex-col gap-3.5 px-8 py-7 xl:col-span-2">
          <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
            <h2 className="text-[19px] font-bold">Домашні завдання</h2>
            <span className="text-sm text-muted">Нагадаємо батькам за день до дедлайну</span>
          </div>
          {o.homework.length === 0 && <p className="text-muted">Поки що домашок немає — вони з’являються після уроків.</p>}
          {o.homework.map((h) => (
            <Link
              key={h.id}
              href={`/learn/${h.courseSlug}/${h.lessonOrder}#homework`}
              className="flex min-h-16 items-center justify-between gap-4 rounded-2xl bg-ink px-4.5 py-3 hover:bg-[#141835]"
            >
              <div className="flex flex-col gap-1">
                <span className="font-semibold">
                  {h.courseTitle} · урок {h.lessonOrder}: {h.lessonTitle}
                </span>
                <span className="text-sm text-muted">
                  {h.status === "pending" ? `Дедлайн ${formatShortDate(h.dueAt)}` : h.teacherComment ? `Викладач: «${h.teacherComment}»` : "Здано"}
                </span>
              </div>
              {h.status === "pending" ? (
                <StatusBadge tone={h.dueAt && h.dueAt < now ? "bad" : "wait"}>{h.dueAt && h.dueAt < now ? "Прострочено" : "Чекає"}</StatusBadge>
              ) : h.status === "submitted" ? (
                <StatusBadge tone="wait">На перевірці</StatusBadge>
              ) : (
                <StatusBadge tone="good">{h.score != null ? `Перевірено · ${h.score}/${h.maxScore}` : "Зараховано"}</StatusBadge>
              )}
            </Link>
          ))}
        </section>

        <section className="flex flex-col gap-3 rounded-3xl border border-line-2 bg-[#1b2144] p-7">
          <span className="self-start rounded-full bg-[#3a2e14] px-2.5 py-1 text-xs font-bold text-amber">НОВИНКИ</span>
          <h2 className="text-[19px] font-bold">Скоро: курс Next.js</h2>
          <p className="leading-relaxed text-muted">
            Зроби власний сайт, як справжні розробники. Учні з тарифом Преміум отримають доступ першими.
          </p>
        </section>
      </div>

      <section id="courses" className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-bold">Усі курси</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {published.map((c) => (
            <Link key={c.id} href={`/courses/${c.slug}`} className="card flex flex-col gap-2 p-6 hover:border-accent">
              <span className="text-lg font-bold">{c.title}</span>
              <span className="text-sm text-muted">{c.description}</span>
            </Link>
          ))}
          {o.allCourses
            .filter((c) => c.status === "soon")
            .slice(0, 4)
            .map((c) => (
              <div key={c.id} className="flex flex-col gap-2 rounded-3xl border border-dashed border-line-2 p-6 text-muted">
                <span className="text-lg font-bold">{c.title}</span>
                <span className="text-sm text-amber">Скоро</span>
              </div>
            ))}
        </div>
      </section>
    </CabinetShell>
  );
}
