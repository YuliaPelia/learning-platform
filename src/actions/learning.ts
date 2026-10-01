"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { canAccessLesson } from "@/lib/access";
import { requireUser } from "@/lib/dal";
import { getStudentSubscriptions, bestLivePlan } from "@/lib/learning";
import { appUrl, sendEmail } from "@/lib/mailer";
import { PLANS } from "@/lib/plans";

const HOMEWORK_DAYS = 7;

/** Дитина завершила урок: записуємо прогрес і, якщо треба, видаємо домашку. */
export async function completeLesson(formData: FormData) {
  const student = await requireUser("student");
  const lessonId = String(formData.get("lessonId") ?? "");

  const [lesson] = await db.select().from(schema.lessons).where(eq(schema.lessons.id, lessonId));
  if (!lesson) return;
  const [course] = await db.select().from(schema.courses).where(eq(schema.courses.id, lesson.courseId));

  // Повторна перевірка доступу на сервері — кнопку в браузері можна підробити
  let prevDone = true;
  if (lesson.order > 1) {
    const [prev] = await db
      .select({ id: schema.lessons.id })
      .from(schema.lessons)
      .where(and(eq(schema.lessons.courseId, lesson.courseId), eq(schema.lessons.order, lesson.order - 1)));
    const [done] = prev
      ? await db
          .select()
          .from(schema.lessonProgress)
          .where(and(eq(schema.lessonProgress.studentId, student.id), eq(schema.lessonProgress.lessonId, prev.id)))
      : [undefined];
    prevDone = !!done;
  }
  const subs = await getStudentSubscriptions(student.id);
  const access = canAccessLesson({
    courseStatus: course.status,
    courseId: course.id,
    lessonOrder: lesson.order,
    previousLessonCompleted: prevDone,
    subscriptions: subs,
  });
  if (access !== "ok") return;

  await db.insert(schema.lessonProgress).values({ studentId: student.id, lessonId }).onConflictDoNothing();

  if (lesson.homeworkPrompt) {
    const plan = bestLivePlan(subs);
    await db
      .insert(schema.homework)
      .values({
        studentId: student.id,
        lessonId,
        dueAt: new Date(Date.now() + HOMEWORK_DAYS * 24 * 60 * 60 * 1000),
        needsTeacher: !!plan && PLANS[plan].teacher,
      })
      .onConflictDoNothing();
  }

  revalidatePath(`/learn/${course.slug}`, "layout");
  revalidatePath("/cabinet/student");

  // Є домашка — лишаємо дитину на уроці, щоб вона одразу побачила завдання
  if (lesson.homeworkPrompt) redirect(`/learn/${course.slug}/${lesson.order}#homework`);

  const [next] = await db
    .select({ order: schema.lessons.order })
    .from(schema.lessons)
    .where(and(eq(schema.lessons.courseId, course.id), eq(schema.lessons.order, lesson.order + 1)));
  redirect(next ? `/learn/${course.slug}/${next.order}` : `/courses/${course.slug}?finished=1`);
}

export async function submitHomework(formData: FormData) {
  const student = await requireUser("student");
  const homeworkId = String(formData.get("homeworkId") ?? "");
  const answer = String(formData.get("answer") ?? "").trim().slice(0, 10000);
  if (!answer) return;
  const [hw] = await db
    .select()
    .from(schema.homework)
    .where(and(eq(schema.homework.id, homeworkId), eq(schema.homework.studentId, student.id)));
  if (!hw || hw.status === "reviewed") return;

  // Без викладача (Простий/Середній) домашка зараховується одразу — дитина бачить еталон у наступних уроках
  await db
    .update(schema.homework)
    .set({ answer, submittedAt: new Date(), status: hw.needsTeacher ? "submitted" : "reviewed", reviewedAt: hw.needsTeacher ? null : new Date() })
    .where(eq(schema.homework.id, hw.id));
  revalidatePath("/cabinet/student");
  revalidatePath("/learn", "layout");
}

/** "Попроси батьків відкрити курс" — лист батькам з посиланням на тарифи. */
export async function requestUnlock(formData: FormData) {
  const student = await requireUser("student");
  const courseTitle = String(formData.get("courseTitle") ?? "курс").slice(0, 80);
  if (!student.parentId) return;
  const [parent] = await db.select().from(schema.users).where(eq(schema.users.id, student.parentId));
  await sendEmail(
    parent?.email,
    `${student.name} просить відкрити курс «${courseTitle}»`,
    `Вітаємо!\n\n${student.name} пройшов(-ла) безкоштовні уроки курсу «${courseTitle}» і хоче продовжити.\nОбрати тариф: ${appUrl("/pricing")}\n\nКоманда ITCodeCraft`,
  );
  const back = String(formData.get("back") ?? "");
  const safeBack = back.startsWith("/") && !back.startsWith("//") ? back.split("?")[0] : "/cabinet/student";
  redirect(`${safeBack}?asked=1`);
}
