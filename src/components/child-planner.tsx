import { PRIORITIES, SLOT_KINDS, WEEKDAYS, formatDuration, formatTime, kyivDay, kyivWeekday, minutesByDay, taskStats, type SlotKindId } from "@/lib/planner";
import { formatShortDate } from "@/lib/format";

type Slot = { id: string; weekday: number; startMinute: number; durationMinutes: number; title: string; kind: SlotKindId };
type Task = { id: string; title: string; done: boolean; doneAt: Date | null; dueDate: Date | null; priority: keyof typeof PRIORITIES };

/** Розклад і задачі дитини в кабінеті батьків — лише перегляд (керує ними сама дитина). */
export function ChildPlanner({ name, slots, tasks, minutesPerDay }: { name: string; slots: Slot[]; tasks: Task[]; minutesPerDay: number }) {
  const perDay = minutesByDay(slots);
  const today = kyivWeekday();
  const todayKey = kyivDay();
  const stats = taskStats(tasks);
  const open = tasks.filter((t) => !t.done).slice(0, 5);
  return (
    <div className="card flex flex-col gap-5 px-8 py-7">
      <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-baseline">
        <h3 className="text-[19px] font-bold">Розклад і задачі</h3>
        <span className="text-sm text-muted">
          {formatDuration(perDay.reduce((a, b) => a + b, 0))} на тиждень · мета {minutesPerDay} хв/день · задач виконано за тиждень: {stats.doneThisWeek}
        </span>
      </div>
      {slots.length === 0 ? (
        <p className="text-muted">{name} ще не склав(-ла) розклад. Це можна зробити в кабінеті дитини.</p>
      ) : (
        <ol className="grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {WEEKDAYS.map((d, day) => (
            <li key={d} className={`flex flex-col gap-1.5 rounded-2xl p-3 ${day === today ? "bg-white ring-1 ring-text shadow-pill" : "bg-surface-2"}`}>
              <span className="flex justify-between text-sm font-bold">
                {d} <span className="font-normal text-muted">{perDay[day] ? `${perDay[day]} хв` : "—"}</span>
              </span>
              {slots
                .filter((s) => s.weekday === day)
                .map((s) => (
                  <span key={s.id} className="text-xs leading-snug">
                    <span className="font-mono text-muted">{formatTime(s.startMinute)}</span> {s.title}
                    <span className="sr-only"> ({SLOT_KINDS[s.kind]})</span>
                  </span>
                ))}
            </li>
          ))}
        </ol>
      )}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-soft">
          Відкриті задачі: {stats.open}
          {stats.overdue ? <span className="text-danger"> · прострочено {stats.overdue}</span> : null}
        </span>
        {open.map((t) => {
          const overdue = t.dueDate && t.dueDate.toISOString().slice(0, 10) < todayKey;
          return (
            <span key={t.id} className="flex justify-between gap-3 rounded-xl bg-ink px-3.5 py-2 text-sm">
              <span>{t.title}</span>
              <span className={overdue ? "text-danger" : "text-muted"}>{t.dueDate ? formatShortDate(t.dueDate) : PRIORITIES[t.priority]}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
