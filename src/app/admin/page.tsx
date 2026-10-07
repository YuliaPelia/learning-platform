import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/db";
import { AdminShell } from "@/components/admin-shell";
import { Notice, StatusBadge } from "@/components/cabinet-shell";
import { requireUser } from "@/lib/dal";
import { CATEGORY_LABELS, plural } from "@/lib/format";

export const metadata: Metadata = { title: "Адмін-панель" };

/** Усі курси платформи: звідси адмін створює, редагує та видаляє курси й уроки. */
export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const admin = await requireUser("admin");
  const sp = await searchParams;
  const courses = await prisma.course.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    include: { minPlan: { select: { name: true } }, _count: { select: { lessons: true } } },
  });

  return (
    <AdminShell user={admin}>
      {sp.deleted && <Notice tone="success">Курс видалено.</Notice>}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="font-display text-3xl font-bold">Курси</h1>
        <Link href="/admin/courses/new" className="btn-primary">+ Новий курс</Link>
      </div>
      {courses.length === 0 && <p className="text-muted">Курсів ще немає — створіть перший.</p>}
      <div className="flex flex-col gap-3">
        {courses.map((c) => (
          <Link key={c.id} href={`/admin/courses/${c.id}`} className="card flex flex-col justify-between gap-3 px-6 py-5 hover:border-accent sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-lg font-bold">{c.title}</span>
              <span className="text-sm text-muted">
                {CATEGORY_LABELS[c.category]} · {c.ageFrom}–{c.ageTo} років · від тарифу «{c.minPlan.name}» ·{" "}
                {plural(c._count.lessons, { one: "урок", few: "уроки", many: "уроків" })}
              </span>
            </div>
            <StatusBadge tone={c.status === "published" ? "good" : "muted"}>{c.status === "published" ? "Опубліковано" : "Скоро"}</StatusBadge>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
