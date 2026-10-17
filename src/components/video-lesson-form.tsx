"use client";

import { useActionState, useEffect, useRef } from "react";
import { addVideoLesson } from "@/actions/videos";
import { Notice } from "@/components/notice";
import { SelectField } from "@/components/select-field";

/** Форма додавання відеоуроку в кінець програми обраного курсу. */
export function VideoLessonForm({ courses }: { courses: { id: string; title: string }[] }) {
  const [state, action, pending] = useActionState(addVideoLesson, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const v = state?.values ?? {};

  // Після успішного збереження очищаємо поля, щоб не випадково додати той самий урок двічі
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-5">
      {state?.error && <Notice tone="warn">{state.error}</Notice>}
      {state?.ok && <Notice tone="success">Відеоурок додано ✔</Notice>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="video-course" className="label">Курс</label>
          <SelectField
            id="video-course"
            name="courseId"
            required
            defaultValue={v.courseId ?? courses[0]?.id}
            options={courses.map((c) => ({ value: c.id, label: c.title }))}
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="video-title" className="label">Назва уроку</label>
          <input id="video-title" name="title" className="field" required maxLength={120} defaultValue={v.title} />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="video-summary" className="label">Одне речення для списку уроків</label>
          <input id="video-summary" name="summary" className="field" maxLength={200} defaultValue={v.summary} />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="video-url" className="label">Посилання на відео</label>
          <input id="video-url" name="videoUrl" type="url" className="field" required maxLength={500} placeholder="https://www.youtube.com/watch?v=…" defaultValue={v.videoUrl} />
          <p className="mt-1.5 text-sm text-faint">YouTube, Vimeo або пряме https-посилання на файл .mp4 / .webm</p>
        </div>
        <div>
          <label htmlFor="video-xp" className="label">XP за проходження</label>
          <input id="video-xp" name="xp" type="number" min={0} max={1000} className="field" required defaultValue={v.xp ?? "100"} />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="video-markdown" className="label">Текст під відео (необов’язково)</label>
          <textarea id="video-markdown" name="markdown" rows={4} className="field" maxLength={50000} defaultValue={v.markdown} />
        </div>
      </div>

      <button type="submit" disabled={pending} className="btn-primary h-12 self-start px-6">
        {pending ? "Додаємо…" : "Додати відеоурок"}
      </button>
    </form>
  );
}
