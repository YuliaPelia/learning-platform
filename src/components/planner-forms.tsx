"use client";

import { useActionState, useEffect, useRef } from "react";
import { addSlot, addTask, saveStudyProfile } from "@/actions/planner";
import { PRIORITIES, SLOT_KINDS, WEEKDAYS, WEEKDAYS_FULL } from "@/lib/planner";

function Alert({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
      {message}
    </p>
  );
}

/** Очищає форму після успіху. */
function useResetOnOk(ok: boolean | undefined) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (ok) ref.current?.reset();
  }, [ok]);
  return ref;
}

export function AddTaskForm() {
  const [state, action, pending] = useActionState(addTask, undefined);
  const ref = useResetOnOk(state?.ok);
  return (
    <form ref={ref} action={action} className="flex flex-col gap-3">
      <label htmlFor="task-title" className="sr-only">Нова задача</label>
      <div className="flex gap-2">
        <input id="task-title" name="title" className="field h-11" placeholder="Нова задача, напр. «Повторити цикли for»" required maxLength={120} defaultValue={state?.values?.title} />
        <button className="btn-primary h-11 shrink-0 px-5" disabled={pending} aria-label="Додати задачу">
          {pending ? "…" : "Додати"}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          Дедлайн
          <input name="dueDate" type="date" className="field h-10 px-3 text-sm" defaultValue={state?.values?.dueDate} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          Пріоритет
          <select name="priority" className="field h-10 px-3 text-sm" defaultValue={state?.values?.priority ?? "normal"}>
            {Object.entries(PRIORITIES).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          Хвилин
          <input name="estMinutes" type="number" min={5} max={600} step={5} className="field h-10 px-3 text-sm" placeholder="30" defaultValue={state?.values?.estMinutes} />
        </label>
      </div>
      <Alert message={state?.error} />
    </form>
  );
}

export function AddSlotForm({ defaultDay }: { defaultDay: number }) {
  const [state, action, pending] = useActionState(addSlot, undefined);
  const ref = useResetOnOk(state?.ok);
  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_0.8fr_0.8fr_1fr_auto] lg:items-end">
      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        Що робимо
        <input name="title" className="field h-11 text-sm" placeholder="Python: урок 3" required maxLength={80} defaultValue={state?.values?.title} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        День
        <select name="weekday" className="field h-11 text-sm" defaultValue={state?.values?.weekday ?? String(defaultDay)}>
          {WEEKDAYS_FULL.map((d, i) => (
            <option key={d} value={i}>{d}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        Початок
        <input name="start" type="time" className="field h-11 text-sm" required defaultValue={state?.values?.start ?? "17:00"} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        Хвилин
        <input name="durationMinutes" type="number" min={10} max={300} step={5} className="field h-11 text-sm" required defaultValue={state?.values?.durationMinutes ?? "30"} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        Тип
        <select name="kind" className="field h-11 text-sm" defaultValue={state?.values?.kind ?? "lesson"}>
          {Object.entries(SLOT_KINDS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </label>
      <button className="btn-primary h-11 px-5" disabled={pending}>{pending ? "Додаємо…" : "Додати"}</button>
      <div className="sm:col-span-2 lg:col-span-6">
        <Alert message={state?.error} />
      </div>
    </form>
  );
}

type Profile = { minutesPerDay: number; studyDays: number[]; busyNote: string; goal: string };

export function StudyProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(saveStudyProfile, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold text-soft">У які дні вчишся</legend>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((d, i) => (
            <label key={d} className="cursor-pointer">
              <input type="checkbox" name="studyDays" value={i} defaultChecked={profile.studyDays.includes(i)} className="peer sr-only" />
              <span className="flex h-10 w-11 items-center justify-center rounded-xl border border-line-2 bg-white/70 text-sm font-semibold text-muted transition peer-checked:border-accent peer-checked:bg-accent peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
                {d}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-soft">
        Скільки хвилин на день готовий(-а) вчитися
        <input name="minutesPerDay" type="number" min={15} max={240} step={5} className="field" defaultValue={profile.minutesPerDay} required />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-soft">
        Чим зайнятий тиждень
        <textarea name="busyNote" rows={2} maxLength={300} className="field h-auto py-2.5 text-[15px] font-normal" placeholder="Школа до 15:00, футбол у вт і чт о 17:00" defaultValue={profile.busyNote} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-soft">
        Моя ціль
        <input name="goal" maxLength={200} className="field font-normal" placeholder="Зробити свою гру до кінця місяця" defaultValue={profile.goal} />
      </label>
      <Alert message={state?.error} />
      <div className="flex items-center gap-3">
        <button className="btn-ghost h-11" disabled={pending}>{pending ? "Зберігаємо…" : "Зберегти"}</button>
        {state?.ok && <span role="status" className="text-sm font-semibold text-good">Збережено ✔</span>}
      </div>
    </form>
  );
}
