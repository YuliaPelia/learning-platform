import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { IconGift } from "@/components/icons";
import { PricingClient } from "@/components/pricing-client";
import { PublicShell } from "@/components/site-chrome";
import { getChildren, getCurrentUser } from "@/lib/dal";
import { PLAN_FEATURES, PLAN_LIST, isPlanId } from "@/lib/plans";

export const metadata: Metadata = { title: "Тарифи" };

const FAQ = [
  ["Як скасувати підписку?", "Кабінет батьків → Підписка → «Скасувати». Наступного списання не буде, доступ діє до кінця оплаченого місяця."],
  ["Що після 2 безкоштовних уроків?", "Курс стає на паузу, прогрес зберігається. Дитина може попросити вас відкрити курс — ви отримаєте лист. Сама дитина нічого не оплачує."],
  ["Чи можна повернути кошти?", "Умови описані в Політиці повернення коштів. Напишіть у підтримку — розглянемо звернення протягом [N] робочих днів."],
  ["Які дані дитини ви зберігаєте?", "Лише ім’я або нікнейм, рік народження та логін. Без фото, школи й адреси. Видалити профіль можна в кабінеті батьків."],
];

export default async function PricingPage({ searchParams }: PageProps<"/pricing">) {
  const sp = await searchParams;
  const initialPlan = isPlanId(sp.plan) ? sp.plan : "standard";
  const user = await getCurrentUser();
  const viewer = !user ? "guest" : user.role === "parent" ? "parent" : "other";
  const kids = user?.role === "parent" ? await getChildren(user.id) : [];
  const courses = await db
    .select({ id: schema.courses.id, title: schema.courses.title })
    .from(schema.courses)
    .where(eq(schema.courses.status, "published"))
    .orderBy(asc(schema.courses.sortOrder));

  return (
    <PublicShell>
      <div className="mx-auto max-w-[1200px] px-4 md:px-6">
        <section className="flex flex-col items-center gap-4.5 pt-16 pb-10 text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">Оберіть тариф</h1>
          <p className="text-xl text-soft">Оплата щомісяця. Скасувати можна будь-коли в кабінеті батьків.</p>
          <div className="flex min-h-11 items-center gap-2.5 rounded-full border border-accent bg-[#1b2a2a] px-4.5 font-semibold">
            <IconGift size={18} className="text-accent" />
            Перші 2 уроки будь-якого курсу — безкоштовно, без картки
          </div>
        </section>

        <PricingClient
          plans={PLAN_LIST}
          features={PLAN_FEATURES}
          initialPlan={initialPlan}
          viewer={viewer}
          childrenList={kids.map((k) => ({ id: k.id, name: k.name }))}
          courses={courses}
        />

        <section className="flex flex-col gap-6 pt-16 pb-14">
          <h2 className="font-display text-3xl font-bold">Часті питання</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {FAQ.map(([q, a]) => (
              <div key={q} className="card flex flex-col gap-2.5 px-7 py-6">
                <h3 className="text-[19px] font-bold">{q}</h3>
                <p className="leading-relaxed text-muted">{a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
