import type { Metadata } from "next";
import { prisma } from "@/db";
import { reviewHomework } from "@/actions/teacher";
import { CabinetShell } from "@/components/cabinet-shell";
import { requireUser } from "@/lib/dal";
import { formatShortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Кабінет викладача" };

/** Черга домашок учнів тарифу Преміум, які чекають на перевірку. */
export default async function TeacherPage() {
  const teacher = await requireUser("teacher", "admin");
  const queue = await prisma.submission.findMany({
    where: { status: "submitted" },
    include: {
      user: { select: { name: true } },
      homework: { include: { lesson: { select: { title: true, order: true, course: { select: { title: true } } } } } },
    },
    orderBy: { submittedAt: "asc" },
  });

  return (
    <CabinetShell nav={[{ href: "/teacher", label: "Перевірка домашок" }]} user={teacher} roleLabel="Викладач">
      <h1 className="font-display text-3xl font-bold">Домашки на перевірку</h1>
      {queue.length === 0 && <p className="text-muted">Черга порожня — усе перевірено 👏</p>}
      {queue.map((hw) => (
        <section key={hw.id} className="card flex flex-col gap-4 p-7">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold">
              {hw.user.name} · {hw.homework.lesson.course.title}, урок {hw.homework.lesson.order}: {hw.homework.lesson.title}
            </h2>
            <span className="text-sm text-muted">Здано {formatShortDate(hw.submittedAt)}</span>
          </div>
          <p className="text-soft">{hw.homework.task}</p>
          <pre className="overflow-x-auto rounded-2xl bg-ink p-4 font-mono text-sm text-soft">{hw.answer}</pre>
          <form action={reviewHomework} className="grid gap-3 md:grid-cols-[140px_1fr_auto] md:items-end">
            <input type="hidden" name="homeworkId" value={hw.id} />
            <div>
              <label htmlFor={`score-${hw.id}`} className="label">Оцінка (0–{hw.homework.maxScore})</label>
              <input id={`score-${hw.id}`} name="score" type="number" min={0} max={hw.homework.maxScore} defaultValue={hw.homework.maxScore} className="field" />
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
