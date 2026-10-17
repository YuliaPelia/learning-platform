import type { Metadata } from "next";
import { prisma } from "@/db";
import { deleteVideoLesson } from "@/actions/videos";
import { AdminShell } from "@/components/admin-shell";
import { TeacherShell } from "@/components/teacher-shell";
import { ConfirmButton } from "@/components/confirm-button";
import { VideoLessonForm } from "@/components/video-lesson-form";
import { requireUser } from "@/lib/dal";
import { plural } from "@/lib/format";

export const metadata: Metadata = { title: "Відеоуроки" };

/** Відеоуроки всіх курсів: викладач і адмін додають їх і видаляють. Інші типи уроків тут не показуються. */
export default async function VideosPage() {
  const user = await requireUser("teacher", "admin");
  const courses = await prisma.course.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      lessons: {
        where: { type: "video" },
        orderBy: { order: "asc" },
        select: { id: true, order: true, title: true, xp: true, _count: { select: { progress: true } } },
      },
    },
  });

  const Shell = user.role === "admin" ? AdminShell : TeacherShell;

  return (
    <Shell user={user}>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold">Відеоуроки</h1>
        <p className="text-muted">Додайте відеоурок у курс — він з’явиться учням у кінці програми. Видалити можна лише відеоурок.</p>
      </div>

      {courses.length === 0 ? (
        <p className="text-muted">Курсів ще немає. Їх створює адмін.</p>
      ) : (
        <>
          <section className="card flex flex-col gap-5 p-7">
            <h2 className="text-xl font-bold">Новий відеоурок</h2>
            <VideoLessonForm courses={courses.map((c) => ({ id: c.id, title: c.title }))} />
          </section>

          {courses.map((course) => (
            <section key={course.id} className="card flex flex-col gap-4 p-7">
              <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                <h2 className="text-xl font-bold">{course.title}</h2>
                <span className="text-sm text-muted">{plural(course.lessons.length, { one: "відеоурок", few: "відеоуроки", many: "відеоуроків" })}</span>
              </div>
              {course.lessons.length === 0 && <p className="text-muted">У цьому курсі ще немає відеоуроків.</p>}
              <ol className="flex flex-col gap-2">
                {course.lessons.map((l) => (
                  <li key={l.id} className="flex flex-col gap-3 rounded-2xl bg-ink px-4 py-3 md:flex-row md:items-center">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-line font-mono text-sm">{l.order}</span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-semibold">{l.title}</span>
                      <span className="text-sm text-muted">
                        {l.xp} XP · {plural(l._count.progress, { one: "учень", few: "учні", many: "учнів" })} розпочали
                      </span>
                    </div>
                    <form action={deleteVideoLesson}>
                      <input type="hidden" name="lessonId" value={l.id} />
                      <ConfirmButton
                        message={`Видалити відеоурок «${l.title}»? Разом з ним зникнуть прогрес учнів за цим уроком, домашка та здані відповіді.`}
                        className="btn h-10 px-4 text-danger hover:bg-danger/10"
                      >
                        Видалити
                      </ConfirmButton>
                    </form>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </>
      )}
    </Shell>
  );
}
