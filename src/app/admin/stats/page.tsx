import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { BarChart, HBars } from "@/components/stats-charts";
import { requireUser } from "@/lib/dal";
import { formatUah, plural } from "@/lib/format";
import { STATS_DAYS, getSiteStats } from "@/lib/stats";

export const metadata: Metadata = { title: "Статистика сайту" };
// Рахуємо на кожен запит — цифри мають бути актуальні
export const dynamic = "force-dynamic";

function Kpi({ label, value, hint, delta }: { label: string; value: string; hint?: string; delta?: number | null }) {
  return (
    <div className="card flex flex-col gap-1.5 px-4 py-4 sm:px-6 sm:py-5">
      <span className="text-sm text-muted">{label}</span>
      <span className="font-display text-xl font-bold sm:text-2xl">{value}</span>
      <span className="flex items-center gap-2 text-[13px] text-muted">
        {delta != null && (
          <span className={`rounded-full px-2 py-0.5 font-bold ${delta >= 0 ? "bg-good/10 text-good" : "bg-danger/10 text-danger"}`}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
          </span>
        )}
        {hint}
      </span>
    </div>
  );
}

/** Статистика платформи для адміна: користувачі, гроші, навчання, домашки, курси. */
export default async function AdminStatsPage() {
  const admin = await requireUser("admin");
  const s = await getSiteStats();
  const learners = s.learning.activeLearners;
  const TOP = 10;
  const topCourses = s.courses.slice(0, TOP);
  const hiddenCourses = s.courses.length - topCourses.length;

  return (
    <AdminShell user={admin}>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-3xl font-bold">Статистика сайту</h1>
        <p className="text-muted">Ключові цифри платформи; графіки — за останні {STATS_DAYS} днів (київський час).</p>
      </div>

      <section aria-label="Ключові показники" className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
        <Kpi label="Користувачі" value={String(s.users.total)} hint={`+${s.users.new30} за ${STATS_DAYS} днів`} />
        <Kpi label="Активні підписки" value={String(s.subscriptions.active)} hint={`${formatUah(s.subscriptions.mrr)} / міс`} />
        <Kpi label={`Виручка за ${STATS_DAYS} днів`} value={formatUah(s.revenue.last30)} delta={s.revenue.delta} hint="проти попередніх" />
        <Kpi label="Пройдено уроків" value={String(s.learning.completedTotal)} hint={`${s.learning.completed30} за ${STATS_DAYS} днів`} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5 sm:p-6">
          <h2 className="mb-4 text-lg font-bold">Нові реєстрації</h2>
          <BarChart title="Реєстрації по днях" points={s.series.registrations} gradientId="g-reg" />
        </div>
        <div className="card p-5 sm:p-6">
          <h2 className="mb-4 text-lg font-bold">Виручка</h2>
          <BarChart title="Оплати по днях" points={s.series.revenue} format={formatUah} gradientId="g-rev" />
        </div>
        <div className="card p-5 sm:p-6 lg:col-span-2">
          <h2 className="mb-4 text-lg font-bold">Пройдені уроки</h2>
          <BarChart title="Уроки по днях" points={s.series.completed} gradientId="g-les" />
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="card flex flex-col gap-4 p-5 sm:p-6">
          <h2 className="text-lg font-bold">Хто на платформі</h2>
          <HBars
            rows={[
              { label: "Батьки", value: s.users.parents },
              { label: "Учні", value: s.users.students },
              { label: "Викладачі", value: s.users.teachers },
            ]}
          />
          <p className="text-sm text-muted">Вчаться (є пройдені уроки): {learners}</p>
        </div>
        <div className="card flex flex-col gap-4 p-5 sm:p-6">
          <h2 className="text-lg font-bold">Активні підписки за тарифами</h2>
          <HBars rows={s.subscriptions.byPlan.map((p) => ({ label: p.name, value: p.count }))} />
        </div>
        <div className="card flex flex-col gap-4 p-5 sm:p-6">
          <h2 className="text-lg font-bold">Домашні завдання</h2>
          <HBars
            rows={[
              { label: "Видано, чекають учня", value: s.homework.pending },
              { label: "Здано, чекають перевірки", value: s.homework.submitted },
              { label: "Перевірено", value: s.homework.reviewed },
            ]}
          />
          <p className="text-sm text-muted">У черзі викладача: {s.homework.teacherQueue}</p>
        </div>
      </section>

      <section className="card overflow-hidden">
        <h2 className="px-5 pt-5 text-lg font-bold sm:px-6 sm:pt-6">Курси за популярністю (топ-{TOP})</h2>
        <div className="overflow-x-auto p-2 sm:p-4">
          <table className="w-full min-w-[480px] text-left text-sm">
            <caption className="sr-only">Кількість пройдених уроків і учнів по курсах</caption>
            <thead className="text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Курс</th>
                <th scope="col" className="px-3 py-2 font-medium">Уроків</th>
                <th scope="col" className="px-3 py-2 font-medium">Пройдено</th>
                <th scope="col" className="px-3 py-2 font-medium">Учнів</th>
              </tr>
            </thead>
            <tbody>
              {topCourses.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <th scope="row" className="px-3 py-3 font-semibold">
                    {c.title}
                    {!c.published && <span className="ml-2 text-xs font-normal text-amber">скоро</span>}
                  </th>
                  <td className="px-3 py-3 text-soft">{c.lessons}</td>
                  <td className="px-3 py-3 font-bold">{c.completions}</td>
                  <td className="px-3 py-3 text-soft">{plural(c.learners, { one: "учень", few: "учні", many: "учнів" })}</td>
                </tr>
              ))}
              {s.courses.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-muted">Курсів ще немає.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {hiddenCourses > 0 && (
          <p className="px-5 pb-5 text-sm text-muted sm:px-6">
            Ще {plural(hiddenCourses, { one: "курс", few: "курси", many: "курсів" })} — з меншою активністю. Усі курси: розділ «Курси».
          </p>
        )}
      </section>
    </AdminShell>
  );
}
