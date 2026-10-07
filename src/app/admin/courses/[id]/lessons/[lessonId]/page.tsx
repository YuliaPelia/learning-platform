import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/db";
import { LessonForm } from "@/components/admin-forms";
import { AdminShell } from "@/components/admin-shell";
import { IconCheck } from "@/components/icons";
import { requireUser } from "@/lib/dal";
import { parseLessonContent } from "@/lib/lesson-content";
import { Markdown } from "@/lib/markdown";

export const metadata: Metadata = { title: "Редагування уроку" };

export default async function AdminLessonPage({ params }: PageProps<"/admin/courses/[id]/lessons/[lessonId]">) {
  const admin = await requireUser("admin");
  const { id, lessonId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(lessonId)) notFound();
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, courseId: id },
    include: { course: { select: { id: true, title: true } }, homework: { include: { _count: { select: { submissions: true } } } } },
  });
  if (!lesson) notFound();
  const content = parseLessonContent(lesson.type, lesson.content);
  const { homework } = lesson;

  return (
    <AdminShell user={admin}>
      <div className="flex flex-col gap-2">
        <Link href={`/admin/courses/${lesson.course.id}`} className="text-sm text-muted hover:text-text">← {lesson.course.title}</Link>
        <h1 className="font-display text-3xl font-bold">
          Урок {lesson.order}: {lesson.title}
        </h1>
      </div>

      <section className="card p-7">
        <LessonForm
          courseId={lesson.course.id}
          lessonId={lesson.id}
          initialQuestions={content.questions}
          submissionsCount={homework?._count.submissions ?? 0}
          initial={{
            type: lesson.type,
            title: lesson.title,
            summary: lesson.summary,
            xp: String(lesson.xp),
            videoUrl: content.videoUrl ?? "",
            markdown: content.markdown,
            hasHomework: !!homework,
            homeworkTask: homework?.task ?? "",
            maxScore: String(homework?.maxScore ?? 10),
            dueDays: String(homework?.dueDays ?? 7),
          }}
        />
      </section>

      {/* Збережена версія уроку — так, як її бачить учень (у тесті позначено правильні відповіді) */}
      <section className="flex flex-col gap-6 rounded-3xl border border-dashed border-line-2 p-7">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold">Перегляд збереженого уроку</h2>
          <p className="text-sm text-muted">Так урок бачить учень. Незбережені зміни з форми тут не показуються.</p>
        </div>
        {content.videoUrl && (
          <div className="aspect-video overflow-hidden rounded-3xl bg-surface">
            {/\.(mp4|webm)(\?|$)/i.test(content.videoUrl) ? (
              <video src={content.videoUrl} controls className="h-full w-full" />
            ) : (
              <iframe src={content.videoUrl} title={lesson.title} className="h-full w-full" allowFullScreen />
            )}
          </div>
        )}
        {content.markdown && <Markdown source={content.markdown} />}
        {content.questions.map((q, qi) => (
          <div key={qi} className="flex flex-col gap-2.5">
            <p className="font-semibold">
              {qi + 1}. {q.q}
            </p>
            {q.options.map((opt, oi) => (
              <div key={oi} className={`flex items-center gap-3 rounded-xl px-4 py-3 ${oi === q.answer ? "bg-[#1f3029] text-accent" : "bg-ink"}`}>
                {oi === q.answer && <IconCheck size={16} />}
                <span>{opt}</span>
                {oi === q.answer && <span className="sr-only">(правильна відповідь)</span>}
              </div>
            ))}
          </div>
        ))}
        {homework && (
          <div className="card flex flex-col gap-2 p-6">
            <h3 className="font-bold">Домашнє завдання</h3>
            <p className="leading-relaxed whitespace-pre-wrap text-soft">{homework.task}</p>
            <span className="text-sm text-muted">
              Максимум {homework.maxScore} балів · {homework.dueDays} дн. на виконання
            </span>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
