import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconCheck, IconLock, IconPlay } from "@/components/icons";
import { Notice } from "@/components/cabinet-shell";
import { PublicShell } from "@/components/site-chrome";
import { getCurrentUser } from "@/lib/dal";
import { getCourseState } from "@/lib/learning";
import { FREE_LESSONS } from "@/lib/plans";

export async function generateMetadata({ params }: PageProps<"/courses/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const state = await getCourseState(slug, null);
  return { title: state ? `Курс ${state.course.title}` : "Курс" };
}

export default async function CoursePage({ params, searchParams }: PageProps<"/courses/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  const state = await getCourseState(slug, user?.role === "student" ? user.id : null);
  if (!state) notFound();
  const { course, items } = state;
  const next = items.find((i) => !i.done);

  return (
    <PublicShell>
      <div className="mx-auto flex max-w-[960px] flex-col gap-8 px-4 py-14 md:px-6">
        {sp.finished && <Notice tone="success">Ти пройшов(-ла) всі уроки курсу! 🎉 Скоро тут з’являться нові модулі.</Notice>}
        <div className="flex flex-col gap-4">
          <span className="text-muted">
            {course.ageFrom}–{course.ageTo} років · {items.length} уроків · перші {FREE_LESSONS} безкоштовно
          </span>
          <h1 className="font-display text-4xl font-bold md:text-5xl">{course.title}</h1>
          <p className="max-w-[640px] text-xl leading-relaxed text-soft">{course.description}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {course.status !== "published" ? (
              <span className="btn-ghost cursor-default">Курс готується — скоро відкриємо</span>
            ) : user?.role === "student" ? (
              next && (
                <Link href={`/learn/${course.slug}/${next.lesson.order}`} className="btn-primary h-14 px-7 text-lg">
                  {state.completedCount ? "Продовжити" : "Почати курс"} <IconPlay />
                </Link>
              )
            ) : user?.role === "parent" ? (
              <>
                <Link href="/cabinet/parent#add-child" className="btn-ghost h-auto min-h-14 px-6 py-2 text-center">Дитина проходить курс зі свого акаунта</Link>
                <Link href="/pricing" className="btn-primary h-14 px-6">Відкрити весь курс</Link>
              </>
            ) : (
              <Link href="/register" className="btn-primary h-14 px-7 text-lg">Спробувати {FREE_LESSONS} уроки безкоштовно</Link>
            )}
          </div>
        </div>

        {items.length > 0 && (
          <ol className="flex flex-col gap-3">
            {items.map(({ lesson, done, access }) => (
              <li key={lesson.id} className="card flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:flex-nowrap sm:gap-5 sm:px-6 sm:py-5">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-mono font-bold ${
                    done ? "bg-accent text-white" : "bg-surface-2 text-soft"
                  }`}
                >
                  {done ? <IconCheck size={18} /> : lesson.order}
                </span>
                <div className="flex min-w-0 flex-1 basis-[calc(100%-4.5rem)] flex-col gap-1 sm:basis-auto">
                  <span className="text-lg font-semibold">{lesson.title}</span>
                  <span className="text-muted">{lesson.summary}</span>
                </div>
                {lesson.order <= FREE_LESSONS ? (
                  <span className="ml-[3.75rem] shrink-0 rounded-full bg-good/10 px-3 py-1 text-[13px] font-bold text-good sm:ml-0">Безкоштовно</span>
                ) : access === "needs_subscription" ? (
                  <IconLock className="ml-[3.75rem] shrink-0 text-faint sm:ml-0" />
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>
    </PublicShell>
  );
}
