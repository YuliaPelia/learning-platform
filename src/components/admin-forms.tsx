"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveCourse, saveLesson } from "@/actions/admin";
import { CATEGORY_LABELS } from "@/lib/format";
import type { QuizQuestion } from "@/lib/lesson-content";

function ErrorBox({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-danger">
      {message}
    </p>
  );
}

export type CourseFormValues = {
  title: string;
  slug: string;
  description: string;
  category: string;
  ageFrom: string;
  ageTo: string;
  status: string;
  minPlan: string;
  sortOrder: string;
};

export function CourseForm({
  courseId,
  initial,
  plans,
}: {
  courseId?: string;
  initial: CourseFormValues;
  plans: Array<{ code: string; name: string }>;
}) {
  const [state, action, pending] = useActionState(saveCourse, undefined);
  const v = { ...initial, ...state?.values };
  // key — щоб після збереження поля показували те, що щойно ввели (форма скидається до defaultValue)
  const formKey = JSON.stringify(v);

  return (
    <form key={formKey} action={action} className="grid gap-4 md:grid-cols-2">
      {courseId && <input type="hidden" name="courseId" value={courseId} />}
      <div>
        <label htmlFor="course-title" className="label">Назва курсу</label>
        <input id="course-title" name="title" className="field" required maxLength={80} defaultValue={v.title} />
      </div>
      <div>
        <label htmlFor="course-slug" className="label">Адреса курсу (slug)</label>
        <input id="course-slug" name="slug" className="field font-mono" required maxLength={40} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={v.slug} />
        <p className="mt-1.5 text-sm text-faint">Латиницею, напр. python-start → /courses/python-start</p>
      </div>
      <div className="md:col-span-2">
        <label htmlFor="course-description" className="label">Короткий опис</label>
        <textarea id="course-description" name="description" rows={3} maxLength={500} className="field h-auto py-3" defaultValue={v.description} />
      </div>
      <div>
        <label htmlFor="course-category" className="label">Категорія</label>
        <select id="course-category" name="category" className="field" defaultValue={v.category}>
          {Object.entries(CATEGORY_LABELS).map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="course-age-from" className="label">Вік від</label>
          <input id="course-age-from" name="ageFrom" type="number" min={5} max={18} className="field" required defaultValue={v.ageFrom} />
        </div>
        <div>
          <label htmlFor="course-age-to" className="label">Вік до</label>
          <input id="course-age-to" name="ageTo" type="number" min={5} max={18} className="field" required defaultValue={v.ageTo} />
        </div>
      </div>
      <div>
        <label htmlFor="course-status" className="label">Статус</label>
        <select id="course-status" name="status" className="field" defaultValue={v.status}>
          <option value="soon">Скоро (уроки закриті)</option>
          <option value="published">Опубліковано</option>
        </select>
      </div>
      <div>
        <label htmlFor="course-plan" className="label">Мінімальний тариф</label>
        <select id="course-plan" name="minPlan" className="field" defaultValue={v.minPlan}>
          {plans.map((p) => (
            <option key={p.code} value={p.code}>{p.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="course-sort" className="label">Порядок у каталозі</label>
        <input id="course-sort" name="sortOrder" type="number" min={0} max={9999} className="field" required defaultValue={v.sortOrder} />
        <p className="mt-1.5 text-sm text-faint">Менше число — вище в списку</p>
      </div>
      <div className="flex flex-col gap-3 md:col-span-2">
        <ErrorBox message={state?.error} />
        {state?.ok && (
          <p role="status" className="rounded-xl bg-[#1b2a2a] px-4 py-3 text-accent">Зміни збережено ✔</p>
        )}
        <button type="submit" disabled={pending} className="btn-primary self-start">
          {pending ? "Зберігаємо…" : courseId ? "Зберегти курс" : "Створити курс"}
        </button>
      </div>
    </form>
  );
}

export type LessonFormValues = {
  type: string;
  title: string;
  summary: string;
  xp: string;
  videoUrl: string;
  markdown: string;
  hasHomework: boolean;
  homeworkTask: string;
  maxScore: string;
  dueDays: string;
};

const EMPTY_QUESTION: QuizQuestion = { q: "", options: ["", ""], answer: 0 };

export function LessonForm({
  courseId,
  lessonId,
  initial,
  initialQuestions,
  submissionsCount = 0,
}: {
  courseId: string;
  lessonId?: string;
  initial: LessonFormValues;
  initialQuestions: QuizQuestion[];
  /** Скільки учнів уже отримали домашку цього уроку — щоб попередити перед її видаленням */
  submissionsCount?: number;
}) {
  const [state, action, pending] = useActionState(saveLesson, undefined);
  const v = { ...initial, ...state?.values };
  const [type, setType] = useState(initial.type);
  const [hasHomework, setHasHomework] = useState(initial.hasHomework);
  const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuestions.length ? initialQuestions : [EMPTY_QUESTION]);

  const patch = (qi: number, change: Partial<QuizQuestion>) => setQuestions((qs) => qs.map((q, i) => (i === qi ? { ...q, ...change } : q)));

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="courseId" value={courseId} />
      {lessonId && <input type="hidden" name="lessonId" value={lessonId} />}
      <input type="hidden" name="questions" value={JSON.stringify(questions)} />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="lesson-type" className="label">Тип уроку</label>
          <select id="lesson-type" name="type" className="field" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="text">Текстовий урок</option>
            <option value="video">Відеоурок</option>
            <option value="quiz">Тест</option>
          </select>
        </div>
        <div>
          <label htmlFor="lesson-xp" className="label">XP за проходження</label>
          <input id="lesson-xp" name="xp" type="number" min={0} max={1000} className="field" required defaultValue={v.xp} />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="lesson-title" className="label">Назва уроку</label>
          <input id="lesson-title" name="title" className="field" required maxLength={120} defaultValue={v.title} />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="lesson-summary" className="label">Одне речення для списку уроків</label>
          <input id="lesson-summary" name="summary" className="field" maxLength={200} defaultValue={v.summary} />
        </div>
      </div>

      {/* Поле лишається у формі й для інших типів (приховане), щоб значення не губилося при перемиканні типу */}
      <div className={type === "video" ? "" : "hidden"}>
        <label htmlFor="lesson-video" className="label">Посилання на відео</label>
        <input id="lesson-video" name="videoUrl" type="url" className="field" maxLength={500} placeholder="https://www.youtube.com/watch?v=…" defaultValue={v.videoUrl} />
        <p className="mt-1.5 text-sm text-faint">YouTube, Vimeo або пряме https-посилання на файл .mp4 / .webm</p>
      </div>

      <div>
        <label htmlFor="lesson-markdown" className="label">
          {type === "text" ? "Текст уроку" : type === "video" ? "Текст під відео (необов’язково)" : "Вступ до тесту (необов’язково)"}
        </label>
        <textarea id="lesson-markdown" name="markdown" rows={14} className="field h-auto py-3 font-mono text-[15px]" defaultValue={v.markdown} />
        <p className="mt-1.5 text-sm text-faint">
          Markdown: «## Заголовок», списки з «- », **жирний**, `код`, блоки коду між рядками ```
        </p>
      </div>

      {type === "quiz" && (
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-3 text-lg font-bold">Питання тесту</legend>
          {questions.map((q, qi) => (
            <div key={qi} className="flex flex-col gap-3 rounded-2xl bg-ink p-5">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label htmlFor={`q-${qi}`} className="label">Питання {qi + 1}</label>
                  <input id={`q-${qi}`} className="field bg-surface" maxLength={500} value={q.q} onChange={(e) => patch(qi, { q: e.target.value })} />
                </div>
                {questions.length > 1 && (
                  <button type="button" className="btn h-12 text-danger hover:bg-danger/10" onClick={() => setQuestions((qs) => qs.filter((_, i) => i !== qi))}>
                    Видалити
                  </button>
                )}
              </div>
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name={`answer-${qi}`}
                    checked={q.answer === oi}
                    onChange={() => patch(qi, { answer: oi })}
                    className="h-5 w-5 shrink-0 accent-accent"
                    aria-label={`Варіант ${oi + 1} — правильна відповідь`}
                  />
                  <input
                    className="field bg-surface"
                    maxLength={300}
                    placeholder={`Варіант ${oi + 1}`}
                    aria-label={`Питання ${qi + 1}, варіант ${oi + 1}`}
                    value={opt}
                    onChange={(e) => patch(qi, { options: q.options.map((o, i) => (i === oi ? e.target.value : o)) })}
                  />
                  {q.options.length > 2 && (
                    <button
                      type="button"
                      className="shrink-0 px-2 text-xl text-muted hover:text-danger"
                      aria-label={`Видалити варіант ${oi + 1}`}
                      onClick={() =>
                        patch(qi, {
                          options: q.options.filter((_, i) => i !== oi),
                          answer: q.answer === oi ? 0 : q.answer > oi ? q.answer - 1 : q.answer,
                        })
                      }
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-faint">Позначте кружечком правильну відповідь</span>
                {q.options.length < 8 && (
                  <button type="button" className="text-sm font-semibold text-accent hover:underline" onClick={() => patch(qi, { options: [...q.options, ""] })}>
                    + Варіант
                  </button>
                )}
              </div>
            </div>
          ))}
          {questions.length < 50 && (
            <button type="button" className="btn-ghost self-start" onClick={() => setQuestions((qs) => [...qs, EMPTY_QUESTION])}>
              + Додати питання
            </button>
          )}
        </fieldset>
      )}

      <fieldset className="flex flex-col gap-4 border-t border-line pt-6">
        <label className="flex cursor-pointer items-center gap-3 font-semibold">
          <input type="checkbox" name="hasHomework" className="h-5 w-5 shrink-0 accent-accent" checked={hasHomework} onChange={(e) => setHasHomework(e.target.checked)} />
          Є домашнє завдання
        </label>
        {!hasHomework && initial.hasHomework && (
          <p className="rounded-xl bg-[#2a2414] px-4 py-3 text-amber">
            Після збереження домашку буде видалено
            {submissionsCount > 0 ? ` разом з відповідями та листуванням учнів (${submissionsCount})` : ""}.
          </p>
        )}
        <div className={hasHomework ? "grid gap-4 md:grid-cols-2" : "hidden"}>
          <div className="md:col-span-2">
            <label htmlFor="lesson-homework" className="label">Завдання</label>
            <textarea id="lesson-homework" name="homeworkTask" rows={4} maxLength={5000} className="field h-auto py-3" defaultValue={v.homeworkTask} />
          </div>
          <div>
            <label htmlFor="lesson-max-score" className="label">Максимальна оцінка</label>
            <input id="lesson-max-score" name="maxScore" type="number" min={1} max={100} className="field" defaultValue={v.maxScore} />
          </div>
          <div>
            <label htmlFor="lesson-due-days" className="label">Днів на виконання</label>
            <input id="lesson-due-days" name="dueDays" type="number" min={1} max={60} className="field" defaultValue={v.dueDays} />
          </div>
        </div>
      </fieldset>

      <ErrorBox message={state?.error} />
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Зберігаємо…" : lessonId ? "Зберегти урок" : "Додати урок"}
        </button>
        <Link href={`/admin/courses/${courseId}`} className="btn-ghost">Скасувати</Link>
      </div>
    </form>
  );
}
