import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/db";
import { CourseForm } from "@/components/admin-forms";
import { AdminShell } from "@/components/admin-shell";
import { requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Новий курс" };

export default async function NewCoursePage() {
  const admin = await requireUser("admin");
  const plans = await prisma.plan.findMany({ orderBy: { rank: "asc" }, select: { code: true, name: true } });
  const last = await prisma.course.aggregate({ _max: { sortOrder: true } });

  return (
    <AdminShell user={admin}>
      <div className="flex flex-col gap-2">
        <Link href="/admin" className="text-sm text-muted hover:text-text">← Усі курси</Link>
        <h1 className="font-display text-3xl font-bold">Новий курс</h1>
        <p className="text-muted">Після створення ви зможете додати уроки, відео, тести й домашні завдання.</p>
      </div>
      <section className="card p-7">
        <CourseForm
          plans={plans}
          initial={{
            title: "",
            slug: "",
            description: "",
            category: "code",
            ageFrom: "9",
            ageTo: "17",
            status: "soon",
            minPlan: "basic",
            sortOrder: String((last._max.sortOrder ?? -1) + 1),
          }}
        />
      </section>
    </AdminShell>
  );
}
