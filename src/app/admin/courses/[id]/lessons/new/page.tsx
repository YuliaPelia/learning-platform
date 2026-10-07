import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/db";
import { LessonForm } from "@/components/admin-forms";
import { AdminShell } from "@/components/admin-shell";
import { requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Новий урок" };

export default async function NewLessonPage({ params }: PageProps<"/admin/courses/[id]/lessons/new">) {
  const admin = await requireUser("admin");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const course = await prisma.course.findUnique({ where: { id }, select: { id: true, title: true, _count: { select: { lessons: true } } } });
  if (!course) notFound();

  return (
    <AdminShell user={admin}>
      <div className="flex flex-col gap-2">
        <Link href={`/admin/courses/${course.id}`} className="text-sm text-muted hover:text-text">← {course.title}</Link>
        <h1 className="font-display text-3xl font-bold">Новий урок</h1>
        <p className="text-muted">Урок буде додано в кінець програми — під номером {course._count.lessons + 1}.</p>
      </div>
      <section className="card p-7">
        <LessonForm
          courseId={course.id}
          initialQuestions={[]}
          initial={{ type: "text", title: "", summary: "", xp: "100", videoUrl: "", markdown: "", hasHomework: false, homeworkTask: "", maxScore: "10", dueDays: "7" }}
        />
      </section>
    </AdminShell>
  );
}
