import type { Metadata } from "next";
import Link from "next/link";
import { deleteSlot, deleteTask, toggleTask } from "@/actions/planner";
import { CabinetShell, Notice, StatusBadge } from "@/components/cabinet-shell";
import { DeleteAccountForm } from "@/components/delete-account-form";
import { IconCheck, IconFlame, IconLock, IconPlay, IconStar, IconX } from "@/components/icons";
import { AddSlotForm, AddTaskForm, StudyProfileForm } from "@/components/planner-forms";
import { Mascot, MascotAvatar } from "@/components/mascot";
import { requireUser } from "@/lib/dal";
import { formatShortDate, pluralDays } from "@/lib/format";
import { getStudentOverview } from "@/lib/learning";
import {
  PRIORITIES,
  SLOT_KINDS,
  WEEKDAYS,
  WEEKDAYS_FULL,
  averageScore,
  formatDuration,
  formatTime,
  greeting,
  kyivDay,
  kyivHour,
  kyivWeekday,
  loadLevel,
  minutesByDay,
  robotMessage,
  taskStats,
} from "@/lib/planner";
import { getCourseProgress, getPlanner } from "@/lib/planner-data";

export const metadata: Metadata = { title: "Мій кабінет" };

const NAV = [
  { href: "/cabinet/student", label: "Огляд" },
  { href: "/cabinet/student#schedule", label: "Розклад" },
  { href: "/cabinet/student#tasks", label: "Задачі" },
  { href: "/cabinet/student#progress", label: "Прогрес" },
  { href: "/cabinet/student#week", label: "Мій тиждень" },
  { href: "/cabinet/student#homework", label: "Домашки" },
  { href: "/cabinet/student#courses", label: "Усі курси" },
];

/** Колір і підпис типу заняття — колір завжди йде разом із текстом. */
const KIND_STYLE: Record<string, string> = {
  lesson: "border-l-accent bg-accent/8",
  homework: "border-l-pink bg-pink/8",
  practice: "border-l-sky-500 bg-sky-500/8",
  rest: "border-l-emerald-500 bg-emerald-500/8",
  other: "border-l-faint bg-surface-2/70",
};

const PRIORITY_TONE = { high: "bad", normal: "muted", low: "muted" } as const;

export default async function StudentCabinet({ searchParams }: PageProps<"/cabinet/student">) {
  const student = await requireUser("student");
  const sp = await searchParams;
  const o = await getStudentOverview(student.id);
  const [planner, courses] = await Promise.all([getPlanner(student.id), getCourseProgress(student.id, o.currentCourse?.id ?? null)]);
  const { tasks, slots, profile } = planner;

  const now = new Date();
  const today = kyivWeekday(now);
  const todayKey = kyivDay(now);
  const perDay = minutesByDay(slots);
  const weekMinutes = perDay.reduce((s, m) => s + m, 0);
  const ts = taskStats(tasks, now);
  const avg = averageScore(o.homework.filter((h) => h.status === "reviewed"));
  const pendingHw = o.homework.filter((h) => h.status === "pending");
  const overdueHw = pendingHw.filter((h) => h.dueAt && h.dueAt < now).length;
  const dueSoonHw = pendingHw.filter((h) => h.dueAt && h.dueAt >= now && h.dueAt.getTime() - now.getTime() < 2 * 24 * 60 * 60 * 1000).length;
  const todaySlots = slots.filter((s) => s.weekday === today && s.kind !== "rest");

  const tip = robotMessage({ todaySlots, overdueHomework: overdueHw, dueSoonHomework: dueSoonHw, openTasks: ts.open, streak: o.streak, hasSchedule: slots.length > 0 });

  const continueCourse = courses.find((c) => c.id === o.currentCourse?.id) ?? courses[0] ?? null;
  const maxActivity = Math.max(1, ...o.week.map((d) => d.count));
  const published = o.allCourses.filter((c) => c.status === "published");

  return (
    <CabinetShell nav={NAV} user={student} roleLabel="Учень">
      {sp.asked && <Notice tone="success">Ми надіслали батькам лист із проханням відкрити курс 🙌</Notice>}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        {/* ── Привітання з роботом ── */}
        <section className="glass relative overflow-hidden p-6 md:p-8" aria-labelledby="hello">
          <div className="grid items-center gap-6 md:grid-cols-[1fr_260px]">
            <div className="flex flex-col gap-4">
              <h1 id="hello" className="font-display text-3xl font-extrabold md:text-[38px]">
                {greeting(kyivHour(now))}, {student.name}! 👋
              </h1>
              <div className="flex max-w-[580px] items-start gap-3">
                <MascotAvatar size={44} className="mt-0.5 md:hidden" />
                <div className="relative rounded-[20px] rounded-tl-md bg-surface-2 px-4.5 py-3.5 text-[15px] leading-relaxed text-soft">
                  <span className="mb-1 block text-xs font-bold tracking-wide text-accent uppercase">Робот Кодик</span>
                  {tip}
                </div>
              </div>
              {profile.goal && (
                <p className="text-sm text-muted">
                  🎯 Моя ціль: <span className="font-semibold text-text">{profile.goal}</span>
                </p>
              )}
              <div className="flex flex-wrap gap-2.5">
                {continueCourse?.next ? (
                  <Link href={`/learn/${continueCourse.slug}/${continueCourse.next.order}`} className="btn-primary h-12 px-6">
                    {continueCourse.done ? "Продовжити урок" : "Почати курс"} <IconPlay />
                  </Link>
                ) : (
                  <Link href="#courses" className="btn-primary h-12 px-6">Обрати курс <IconPlay /></Link>
                )}
                <Link href="#schedule" className="btn-ghost h-12">Мій розклад</Link>
              </div>
            </div>
            <Mascot framed className="hidden aspect-[930/735] w-full md:block" sizes="260px" />
          </div>

          <dl className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Рівень" value={`${o.level.level} · ${o.level.title}`} hint={o.level.nextXp ? `ще ${o.level.toNext} XP` : "максимум!"} progress={o.level.progress} />
            <StatTile label="Уроків пройдено" value={String(o.lessonsCompleted)} hint={`${o.lessonsThisWeek} за тиждень`} />
            <StatTile label="Серія" value={pluralDays(o.streak)} hint={o.streak ? "поспіль 🔥" : "почни сьогодні"} />
            <StatTile label="Задач виконано" value={String(ts.doneThisWeek)} hint={ts.overdue ? `${ts.overdue} прострочено` : `за тиждень · ${ts.open} відкрито`} />
          </dl>
        </section>

        {/* ── Права колонка: сьогодні + бейджі ── */}
        <div className="flex flex-col gap-6">
          <section className="glass flex flex-col gap-3.5 p-6" aria-labelledby="today">
            <div className="flex items-center justify-between">
              <h2 id="today" className="text-lg font-bold">Сьогодні · {WEEKDAYS_FULL[today]}</h2>
              <span className="flex items-center gap-1.5 rounded-full bg-amber/15 px-3 py-1 text-sm font-bold text-amber">
                <IconFlame size={16} /> {o.streak}
              </span>
            </div>
            {todaySlots.length ? (
              <ul className="flex flex-col gap-2">
                {todaySlots.map((s) => (
                  <li key={s.id} className={`rounded-xl border-l-4 px-3.5 py-2.5 ${KIND_STYLE[s.kind]}`}>
                    <span className="block font-mono text-xs text-muted">
                      {formatTime(s.startMinute)}–{formatTime(s.startMinute + s.durationMinutes)} · {SLOT_KINDS[s.kind]}
                    </span>
                    <span className="font-semibold">{s.title}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">На сьогодні занять немає. Додай їх у розклад нижче.</p>
            )}
            {pendingHw.length > 0 && (
              <Link href="#homework" className="rounded-xl bg-pink/10 px-3.5 py-2.5 text-sm font-semibold text-pink hover:bg-pink/15">
                Домашок чекає: {pendingHw.length}
                {overdueHw ? ` · прострочено ${overdueHw}` : ""} →
              </Link>
            )}
          </section>

          <section id="badges" className="glass flex flex-col gap-3.5 p-6" aria-labelledby="badges-h">
            <h2 id="badges-h" className="text-lg font-bold">Мої бейджі</h2>
            {o.badgesEnabled ? (
              <div className="grid grid-cols-3 gap-2">
                {o.badges.map((b) => (
                  <div
                    key={b.id}
                    className={`flex flex-col items-center gap-1 rounded-2xl p-2.5 text-center ${b.earned ? "bg-amber/15" : "border border-dashed border-line-2 bg-white/50"}`}
                    title={b.description}
                  >
                    {b.earned ? <IconStar size={22} className="text-amber" /> : <IconLock size={20} className="text-faint" />}
                    <span className={`text-xs font-semibold ${b.earned ? "" : "text-faint"}`}>{b.title}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-muted">
                Бейджі відкриваються в тарифах <b className="text-text">Середній</b> і <b className="text-text">Преміум</b>. Прогрес зберігається!
              </p>
            )}
          </section>
        </div>
      </div>

      {/* ── Розклад на тиждень ── */}
      <section id="schedule" className="glass flex scroll-mt-6 flex-col gap-5 p-6 md:p-7" aria-labelledby="schedule-h">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 id="schedule-h" className="text-xl font-bold">Розклад на тиждень</h2>
            <p className="text-sm text-muted">
              Заплановано {formatDuration(weekMinutes)} навчання · мета {profile.minutesPerDay} хв на день
            </p>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            {Object.entries(SLOT_KINDS).map(([k, l]) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className={`h-3 w-1.5 rounded-sm border-l-4 ${KIND_STYLE[k]}`} aria-hidden /> {l}
              </span>
            ))}
          </div>
        </div>

        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
          {WEEKDAYS.map((d, day) => {
            const daySlots = slots.filter((s) => s.weekday === day);
            const level = loadLevel(perDay[day], profile.minutesPerDay);
            const isStudyDay = profile.studyDays.includes(day);
            return (
              <li key={d} className={`flex min-h-[150px] flex-col gap-2 rounded-[20px] border p-3 ${day === today ? "border-text bg-white shadow-pill" : "border-transparent bg-surface-2"}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-bold">
                    {WEEKDAYS_FULL[day]}
                    {day === today && <span className="ml-1.5 rounded-full bg-text px-2 py-0.5 text-[10px] font-bold text-white">сьогодні</span>}
                  </span>
                  <span
                    className={`text-xs font-semibold ${level === "over" ? "text-danger" : level === "ok" ? "text-good" : "text-faint"}`}
                    title={level === "over" ? "Більше, ніж ти планував(-ла) на день" : undefined}
                  >
                    {perDay[day] ? `${perDay[day]} хв` : isStudyDay ? "вільно" : "вихідний"}
                    {level === "over" && " ⚠"}
                  </span>
                </div>
                {daySlots.length === 0 && <span className="text-xs text-faint">—</span>}
                {daySlots.map((s) => (
                  <div key={s.id} className={`group relative rounded-xl border-l-4 py-2 pr-7 pl-2.5 ${KIND_STYLE[s.kind]}`}>
                    <span className="block font-mono text-[11px] text-muted">
                      {formatTime(s.startMinute)}–{formatTime(s.startMinute + s.durationMinutes)}
                    </span>
                    <span className="block text-sm leading-snug font-semibold">{s.title}</span>
                    <span className="text-[11px] text-muted">
                      {SLOT_KINDS[s.kind]}
                    </span>
                    <form action={deleteSlot} className="absolute top-1.5 right-1.5">
                      <input type="hidden" name="slotId" value={s.id} />
                      <button className="flex h-6 w-6 items-center justify-center rounded-full text-faint hover:bg-white hover:text-danger focus-visible:text-danger" aria-label={`Видалити «${s.title}» (${WEEKDAYS_FULL[day]})`}>
                        <IconX size={14} />
                      </button>
                    </form>
                  </div>
                ))}
              </li>
            );
          })}
        </ol>

        <details className="rounded-[20px] bg-surface-2 p-4" open={slots.length === 0}>
          <summary className="cursor-pointer font-semibold">+ Додати заняття</summary>
          <div className="mt-4">
            <AddSlotForm defaultDay={today} />
          </div>
        </details>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        {/* ── Задачі ── */}
        <section id="tasks" className="glass flex scroll-mt-6 flex-col gap-4 p-6 md:p-7" aria-labelledby="tasks-h">
          <div className="flex items-baseline justify-between">
            <h2 id="tasks-h" className="text-xl font-bold">Мої задачі</h2>
            <span className="text-sm text-muted">
              {ts.open} відкрито{ts.overdue ? ` · ${ts.overdue} прострочено` : ""}
            </span>
          </div>
          <AddTaskForm />
          {tasks.length === 0 ? (
            <p className="text-sm text-muted">Задач поки немає. Запиши першу — маленьку й конкретну.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {tasks.map((t) => {
                const due = t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null;
                const overdue = !t.done && due && due < todayKey;
                return (
                  <li key={t.id} className={`flex items-center gap-3 rounded-xl border border-white/80 px-3 py-2.5 ${t.done ? "bg-white/35" : "bg-white/70"}`}>
                    <form action={toggleTask}>
                      <input type="hidden" name="taskId" value={t.id} />
                      <button
                        className={`flex h-7 w-7 items-center justify-center rounded-lg border-2 transition ${t.done ? "border-text bg-text text-white" : "border-line-2 bg-white hover:border-text"}`}
                        aria-label={t.done ? `Повернути «${t.title}» у роботу` : `Позначити «${t.title}» виконаною`}
                        aria-pressed={t.done}
                      >
                        {t.done && <IconCheck size={14} />}
                      </button>
                    </form>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className={`truncate font-medium ${t.done ? "text-faint line-through" : ""}`}>{t.title}</span>
                      <span className="text-xs text-muted">
                        {due ? (overdue ? <b className="text-danger">прострочено · {formatShortDate(t.dueDate)}</b> : `до ${formatShortDate(t.dueDate)}`) : "без дедлайну"}
                        {t.estMinutes ? ` · ${formatDuration(t.estMinutes)}` : ""}
                      </span>
                    </div>
                    {!t.done && t.priority !== "normal" && <StatusBadge tone={PRIORITY_TONE[t.priority]}>{PRIORITIES[t.priority]}</StatusBadge>}
                    <form action={deleteTask}>
                      <input type="hidden" name="taskId" value={t.id} />
                      <button className="flex h-7 w-7 items-center justify-center rounded-full text-faint hover:bg-white hover:text-danger focus-visible:text-danger" aria-label={`Видалити задачу «${t.title}»`}>
                        <IconX size={14} />
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── Мій тиждень: навантаження й ціль ── */}
        <section id="week" className="glass relative flex scroll-mt-6 flex-col gap-5 overflow-hidden p-6 md:p-7" aria-labelledby="week-h">
                    <div className="flex items-center gap-3">
            <MascotAvatar size={56} />
            <div>
              <h2 id="week-h" className="text-xl font-bold">Мій тиждень</h2>
              <p className="text-sm text-muted">Скажи, скільки часу маєш, — і я підсвічу дні, де навантаження забагато.</p>
            </div>
          </div>
          <StudyProfileForm profile={profile} />
        </section>
      </div>

      {/* ── Прогрес і успішність ── */}
      <section id="progress" className="glass grid scroll-mt-6 gap-8 p-6 md:p-7 lg:grid-cols-[1.1fr_1fr]" aria-labelledby="progress-h">
        <div className="flex flex-col gap-4">
          <div>
            <h2 id="progress-h" className="text-xl font-bold">Активність за 7 днів</h2>
            <p className="text-sm text-muted">Пройдені уроки й здані домашки щодня</p>
          </div>
          <div className="flex h-44 items-end gap-2 pb-px" role="img" aria-label={`Активність за 7 днів: ${o.week.map((d) => `${d.day.slice(5)} — ${d.count}`).join(", ")}`}>
            {o.week.map((d) => {
              const isToday = d.day === todayKey;
              return (
                <div key={d.day} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                  <span className="pointer-events-none absolute -top-1 z-10 -translate-y-full rounded-lg bg-text px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition group-hover:opacity-100">
                    {formatShortDate(new Date(`${d.day}T12:00:00Z`))}: {d.count}
                  </span>
                  <div
                    className={`w-full max-w-9 rounded-full ${d.count ? (isToday ? "bg-text" : "bg-iris") : "bg-line"}`}
                    style={{ height: d.count ? `${Math.max(8, (d.count / maxActivity) * 100)}%` : "4px" }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 text-center text-xs text-muted" aria-hidden>
            {o.week.map((d) => (
              <span key={d.day} className={`flex-1 ${d.day === todayKey ? "font-bold text-text" : ""}`}>
                {WEEKDAYS[(new Date(`${d.day}T12:00:00Z`).getUTCDay() + 6) % 7]}
              </span>
            ))}
          </div>
          <dl className="grid grid-cols-3 gap-3">
            <MiniStat label="Середня оцінка" value={avg == null ? "—" : `${avg}%`} />
            <MiniStat label="Домашок здано" value={`${o.homework.length - pendingHw.length} з ${o.homework.length}`} />
            <MiniStat label="XP загалом" value={String(o.xp)} />
          </dl>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-bold">Прогрес курсів</h3>
          {courses.length === 0 && <p className="text-sm text-muted">Почни будь-який курс — тут з’явиться твій прогрес.</p>}
          {courses.map((c) => {
            const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
            return (
              <Link key={c.id} href={c.next ? `/learn/${c.slug}/${c.next.order}` : `/courses/${c.slug}`} className="flex flex-col gap-2 rounded-2xl bg-surface-2 p-4 hover:bg-[#eceef3]">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">{c.title}</span>
                  <span className="font-mono text-sm font-bold">{pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Прогрес курсу ${c.title}`}>
                  <div className="h-full rounded-full bg-iris" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-muted">
                  {c.done} з {c.total} уроків{c.next ? ` · далі: ${c.next.title}` : " · курс пройдено 🎉"}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Домашки ── */}
      <section id="homework" className="glass flex scroll-mt-6 flex-col gap-3.5 p-6 md:p-7" aria-labelledby="homework-h">
        <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
          <h2 id="homework-h" className="text-xl font-bold">Домашні завдання</h2>
          <span className="text-sm text-muted">Нагадаємо батькам за день до дедлайну</span>
        </div>
        {o.homework.length === 0 && <p className="text-muted">Поки що домашок немає — вони з’являються після уроків.</p>}
        {o.homework.map((h) => (
          <Link key={h.id} href={`/learn/${h.courseSlug}/${h.lessonOrder}#homework`} className="flex min-h-16 items-center justify-between gap-4 rounded-2xl bg-surface-2 px-4.5 py-3 hover:bg-[#eceef3]">
            <div className="flex flex-col gap-1">
              <span className="font-semibold">
                {h.courseTitle} · урок {h.lessonOrder}: {h.lessonTitle}
              </span>
              <span className="text-sm text-muted">
                {h.status === "pending" ? `Дедлайн ${formatShortDate(h.dueAt)}` : h.teacherComment ? `Викладач: «${h.teacherComment}»` : "Здано"}
              </span>
              {h.teacherReplied && <span className="text-sm font-semibold text-accent">Викладач відповів на твоє запитання</span>}
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

      <section id="courses" className="flex scroll-mt-6 flex-col gap-4">
        <h2 className="font-display text-2xl font-extrabold">Усі курси</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {published.map((c) => (
            <Link key={c.id} href={`/courses/${c.slug}`} className="glass hover-lift flex flex-col gap-2 p-6">
              <span className="text-lg font-bold">{c.title}</span>
              <span className="text-sm text-muted">{c.description}</span>
            </Link>
          ))}
          {o.allCourses
            .filter((c) => c.status === "soon")
            .slice(0, 4)
            .map((c) => (
              <div key={c.id} className="flex flex-col gap-2 rounded-(--radius-card) border border-dashed border-line-2 p-6 text-muted">
                <span className="text-lg font-bold">{c.title}</span>
                <span className="text-sm text-amber">Скоро</span>
              </div>
            ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        {student.parentId ? (
          <p className="text-sm text-muted">Твій профіль створили батьки — видалити його можуть вони у своєму кабінеті.</p>
        ) : (
          <DeleteAccountForm consequences="Буде видалено твій профіль, прогрес, домашки, задачі, розклад і листування з викладачем. Відновити їх не вийде." />
        )}
      </section>
    </CabinetShell>
  );
}

function StatTile({ label, value, hint, progress }: { label: string; value: string; hint: string; progress?: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-surface-2 p-4">
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="font-display text-xl font-bold">{value}</dd>
      {progress != null && (
        <div className="h-1.5 overflow-hidden rounded-full bg-white" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="До наступного рівня">
          <div className="bg-iris h-full rounded-full" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
      <dd className="text-xs text-muted">{hint}</dd>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-display text-lg font-bold">{value}</dd>
    </div>
  );
}
