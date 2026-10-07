import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/db";
import { reviewHomework } from "@/actions/teacher";
import { StatusBadge } from "@/components/cabinet-shell";
import { MessageThread } from "@/components/message-thread";
import { TeacherShell } from "@/components/teacher-shell";
import { requireUser } from "@/lib/dal";
import { formatShortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Домашка учня" };

/** Одна домашка учня: завдання, відповідь, оцінка та листування з учнем. */
export default async function TeacherSubmissionPage({ params }: PageProps<"/teacher/submissions/[id]">) {
  const teacher = await requireUser("teacher");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const sub = await prisma.submission.findUnique({
    where: { id },
    include: {
      user: { select: { name: true } },
      homework: { include: { lesson: { select: { title: true, order: true, course: { select: { title: true } } } } } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true, role: true } } } },
    },
  });
  if (!sub) notFound();
  const { homework } = sub;

  return (
    <TeacherShell user={teacher}>
      <div className="flex flex-col gap-2">
        <Link href="/teacher" className="text-sm text-muted hover:text-text">← Перевірка домашок</Link>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h1 className="font-display text-3xl font-bold">{sub.user.name}</h1>
          {sub.status === "pending" ? (
            <StatusBadge tone="muted">Ще не здано · до {formatShortDate(sub.dueAt)}</StatusBadge>
          ) : sub.status === "submitted" ? (
            <StatusBadge tone="wait">Чекає на перевірку</StatusBadge>
          ) : (
            <StatusBadge tone="good">{sub.score != null ? `Оцінка ${sub.score}/${homework.maxScore}` : "Зараховано"}</StatusBadge>
          )}
        </div>
        <p className="text-muted">
          {homework.lesson.course.title}, урок {homework.lesson.order}: {homework.lesson.title}
        </p>
      </div>

      <section className="card flex flex-col gap-4 p-7">
        <h2 className="text-xl font-bold">Завдання</h2>
        <p className="leading-relaxed whitespace-pre-wrap text-soft">{homework.task}</p>
        {sub.answer ? (
          <>
            <h3 className="font-bold">Відповідь учня · здано {formatShortDate(sub.submittedAt)}</h3>
            <pre className="overflow-x-auto rounded-2xl bg-ink p-4 font-mono text-sm text-soft">{sub.answer}</pre>
          </>
        ) : (
          <p className="text-muted">Учень ще не здав відповідь.</p>
        )}
        {sub.teacherComment && <p className="leading-relaxed">Ваш коментар: «{sub.teacherComment}»</p>}
        {sub.status === "submitted" && (
          <form action={reviewHomework} className="grid gap-3 border-t border-line pt-5 md:grid-cols-[140px_1fr_auto] md:items-end">
            <input type="hidden" name="homeworkId" value={sub.id} />
            <div>
              <label htmlFor="score" className="label">Оцінка (0–{homework.maxScore})</label>
              <input id="score" name="score" type="number" min={0} max={homework.maxScore} defaultValue={homework.maxScore} className="field" />
            </div>
            <div>
              <label htmlFor="comment" className="label">Коментар для учня й батьків</label>
              <input id="comment" name="comment" className="field" placeholder="Що вдалося і що покращити" />
            </div>
            <button className="btn-primary">Зарахувати</button>
          </form>
        )}
      </section>

      <section className="card flex flex-col gap-4 p-7">
        <h2 className="text-xl font-bold">Листування з учнем</h2>
        {sub.messages.length === 0 && <p className="text-muted">Повідомлень ще немає — напишіть першим.</p>}
        <MessageThread submissionId={sub.id} messages={sub.messages} viewerId={teacher.id} placeholder="Напишіть учню щодо завдання…" />
      </section>
    </TeacherShell>
  );
}
