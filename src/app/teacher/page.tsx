import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { reviewHomework } from "@/actions/teacher";
import { CabinetShell } from "@/components/cabinet-shell";
import { requireUser } from "@/lib/dal";
import { formatShortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Кабінет викладача" };

/** Черга домашок учнів тарифу Преміум, які чекають на перевірку. */
export default async function TeacherPage() {
  const teacher = await requireUser("teacher", "admin");
  const queue = await db
    .select({
      hw: schema.homework,
      studentName: schema.users.name,
      lessonTitle: schema.lessons.title,
      lessonOrder: schema.lessons.order,
      prompt: schema.lessons.homeworkPrompt,
      courseTitle: schema.courses.title,
    })
    .from(schema.homework)
    .innerJoin(schema.users, eq(schema.users.id, schema.homework.studentId))
    .innerJoin(schema.lessons, eq(schema.lessons.id, schema.homework.lessonId))
    .innerJoin(schema.courses, eq(schema.courses.id, schema.lessons.courseId))
    .where(eq(schema.homework.status, "submitted"))
    .orderBy(asc(schema.homework.submittedAt));

  return (
    <CabinetShell nav={[{ href: "/teacher", label: "Перевірка домашок" }]} user={teacher} roleLabel="Викладач">
      <h1 className="font-display text-3xl font-bold">Домашки на перевірку</h1>
      {queue.length === 0 && <p className="text-muted">Черга порожня — усе перевірено 👏</p>}
      {queue.map(({ hw, studentName, lessonTitle, lessonOrder, prompt, courseTitle }) => (
        <section key={hw.id} className="card flex flex-col gap-4 p-7">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold">
              {studentName} · {courseTitle}, урок {lessonOrder}: {lessonTitle}
            </h2>
            <span className="text-sm text-muted">Здано {formatShortDate(hw.submittedAt)}</span>
          </div>
          <p className="text-soft">{prompt}</p>
          <pre className="overflow-x-auto rounded-2xl bg-ink p-4 font-mono text-sm text-soft">{hw.answer}</pre>
          <form action={reviewHomework} className="grid gap-3 md:grid-cols-[140px_1fr_auto] md:items-end">
            <input type="hidden" name="homeworkId" value={hw.id} />
            <div>
              <label htmlFor={`score-${hw.id}`} className="label">Оцінка (0–10)</label>
              <input id={`score-${hw.id}`} name="score" type="number" min={0} max={10} defaultValue={10} className="field" />
            </div>
            <div>
              <label htmlFor={`comment-${hw.id}`} className="label">Коментар для учня й батьків</label>
              <input id={`comment-${hw.id}`} name="comment" className="field" placeholder="Що вдалося і що покращити" />
            </div>
            <button className="btn-primary">Зарахувати</button>
          </form>
        </section>
      ))}
    </CabinetShell>
  );
}
