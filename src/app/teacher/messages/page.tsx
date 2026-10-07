import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/db";
import { StatusBadge } from "@/components/cabinet-shell";
import { TeacherShell } from "@/components/teacher-shell";
import { requireUser } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Листування з учнями" };

/** Усі гілки листування щодо домашок: зверху ті, де учень чекає на відповідь. */
export default async function TeacherMessagesPage() {
  const teacher = await requireUser("teacher");
  const subs = await prisma.submission.findMany({
    where: { messages: { some: {} } },
    include: {
      user: { select: { name: true } },
      homework: { include: { lesson: { select: { title: true, order: true, course: { select: { title: true } } } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, include: { author: { select: { role: true } } } },
    },
  });
  const threads = subs
    .map((s) => ({ ...s, last: s.messages[0], waiting: s.messages[0].author.role === "student" }))
    .sort((a, b) => Number(b.waiting) - Number(a.waiting) || b.last.createdAt.getTime() - a.last.createdAt.getTime());

  return (
    <TeacherShell user={teacher}>
      <h1 className="font-display text-3xl font-bold">Листування з учнями</h1>
      {threads.length === 0 && (
        <p className="text-muted">Повідомлень ще немає. Написати учню можна зі сторінки його домашки в розділі «Перевірка домашок».</p>
      )}
      <div className="flex flex-col gap-3">
        {threads.map((t) => (
          <Link key={t.id} href={`/teacher/submissions/${t.id}`} className="card flex flex-col justify-between gap-3 px-6 py-5 hover:border-accent sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="font-bold">
                {t.user.name} · {t.homework.lesson.course.title}, урок {t.homework.lesson.order}: {t.homework.lesson.title}
              </span>
              <span className="truncate text-sm text-muted">
                {t.last.author.role === "student" ? t.user.name : "Ви"}: {t.last.body}
              </span>
              <span className="text-[13px] text-faint">{formatDateTime(t.last.createdAt)}</span>
            </div>
            {t.waiting ? <StatusBadge tone="wait">Чекає на відповідь</StatusBadge> : <StatusBadge tone="muted">Відповідь надіслано</StatusBadge>}
          </Link>
        ))}
      </div>
    </TeacherShell>
  );
}
