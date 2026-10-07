import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/db";
import { deleteCourse, deleteLesson, moveLesson } from "@/actions/admin";
import { CourseForm } from "@/components/admin-forms";
import { AdminShell } from "@/components/admin-shell";
import { Notice } from "@/components/cabinet-shell";
import { ConfirmButton } from "@/components/confirm-button";
import { requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Редагування курсу" };

const TYPE_LABELS = { text: "Текст", video: "Відео", quiz: "Тест" } as const;

/** Курс: його дані та навчальна програма (уроки по порядку). */
export default async function AdminCoursePage({ params, searchParams }: PageProps<"/admin/courses/[id]">) {
  const admin = await requireUser("admin");
  const { id } = await params;
  const sp = await searchParams;
  // id з адреси може бути будь-яким рядком, а колонка — uuid
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      minPlan: { select: { code: true } },
      lessons: { orderBy: { order: "asc" }, include: { homework: { select: { id: true } } } },
      _count: { select: { subscriptions: true } },
    },
  });
  if (!course) notFound();
  const plans = await prisma.plan.findMany({ orderBy: { rank: "asc" }, select: { code: true, name: true } });
  const { lessons } = course;

  return (
    <AdminShell user={admin}>
      {sp.saved && <Notice tone="success">Урок збережено ✔</Notice>}
      {sp.error === "subscriptions" && (
        <Notice tone="warn">
          Цей курс не можна видалити: на нього оформлено підписки. Щоб сховати його від учнів, змініть статус на «Скоро».
        </Notice>
      )}

      <div className="flex flex-col gap-2">
        <Link href="/admin" className="text-sm text-muted hover:text-text">← Усі курси</Link>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h1 className="font-display text-3xl font-bold">{course.title}</h1>
          <Link href={`/courses/${course.slug}`} target="_blank" className="btn-ghost h-11">Сторінка курсу на сайті ↗</Link>
        </div>
      </div>

      <section className="card flex flex-col gap-5 p-7">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-xl font-bold">Навчальна програма</h2>
          <Link href={`/admin/courses/${course.id}/lessons/new`} className="btn-primary h-11">+ Додати урок</Link>
        </div>
        {lessons.length === 0 && <p className="text-muted">У курсі ще немає уроків.</p>}
        <ol className="flex flex-col gap-2">
          {lessons.map((l, idx) => (
            <li key={l.id} className="flex flex-col gap-3 rounded-2xl bg-ink px-4 py-3 md:flex-row md:items-center">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-line font-mono text-sm">{l.order}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Link href={`/admin/courses/${course.id}/lessons/${l.id}`} className="font-semibold hover:text-accent">{l.title}</Link>
                <span className="text-sm text-muted">
                  {TYPE_LABELS[l.type]} · {l.xp} XP{l.homework ? " · з домашкою" : ""}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <form action={moveLesson} className="flex gap-2">
                  <input type="hidden" name="lessonId" value={l.id} />
                  <button name="direction" value="up" disabled={idx === 0} className="btn-ghost h-10 px-3" aria-label={`Підняти урок «${l.title}» вище`}>↑</button>
                  <button name="direction" value="down" disabled={idx === lessons.length - 1} className="btn-ghost h-10 px-3" aria-label={`Опустити урок «${l.title}» нижче`}>↓</button>
                </form>
                <Link href={`/admin/courses/${course.id}/lessons/${l.id}`} className="btn-ghost h-10 px-4">Редагувати</Link>
                <form action={deleteLesson}>
                  <input type="hidden" name="lessonId" value={l.id} />
                  <ConfirmButton
                    message={`Видалити урок «${l.title}»? Разом з ним зникнуть прогрес учнів за цим уроком, домашка та здані відповіді.`}
                    className="btn h-10 px-4 text-danger hover:bg-danger/10"
                  >
                    Видалити
                  </ConfirmButton>
                </form>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-sm text-faint">Уроки відкриваються учням по черзі, тож зміна порядку впливає на те, який урок буде наступним.</p>
      </section>

      <section className="card flex flex-col gap-5 p-7">
        <h2 className="text-xl font-bold">Дані курсу</h2>
        <CourseForm
          courseId={course.id}
          plans={plans}
          initial={{
            title: course.title,
            slug: course.slug,
            description: course.description ?? "",
            category: course.category,
            ageFrom: String(course.ageFrom),
            ageTo: String(course.ageTo),
            status: course.status,
            minPlan: course.minPlan.code,
            sortOrder: String(course.sortOrder),
          }}
        />
      </section>

      <section className="flex flex-col gap-3 rounded-3xl border border-danger/40 p-7">
        <h2 className="text-xl font-bold">Видалити курс</h2>
        {course._count.subscriptions > 0 ? (
          <p className="text-muted">На курс оформлено підписки, тому видалити його не можна. Щоб сховати курс, змініть статус на «Скоро».</p>
        ) : (
          <>
            <p className="text-muted">Курс зникне разом з усіма уроками, домашками та прогресом учнів. Цю дію не можна скасувати.</p>
            <form action={deleteCourse}>
              <input type="hidden" name="courseId" value={course.id} />
              <ConfirmButton message={`Видалити курс «${course.title}» з усіма уроками? Цю дію не можна скасувати.`} className="btn bg-danger/10 text-danger hover:bg-danger/20">
                Видалити курс
              </ConfirmButton>
            </form>
          </>
        )}
      </section>
    </AdminShell>
  );
}
