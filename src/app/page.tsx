import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { CourseCatalog, type CatalogGroup } from "@/components/course-catalog";
import { IconArrow, IconCheck, IconClock, IconFlame, IconStar } from "@/components/icons";
import { PublicShell } from "@/components/site-chrome";
import { CATEGORY_LABELS } from "@/lib/format";

// Сторінка читає базу — будуємо її на кожен запит, щоб нові курси з'являлися одразу
export const dynamic = "force-dynamic";

const GROUP_META: Record<string, { note: string; kind: CatalogGroup["kind"] }> = {
  start: { note: "Логіка й алгоритми через ігри", kind: "start" },
  web: { note: "Від першої сторінки до fullstack", kind: "code" },
  design: { note: "Інтерфейси, макети та 3D", kind: "design" },
  code: { note: "Мови, з якими будують реальні продукти", kind: "code" },
  mobile: { note: "Власний застосунок у телефоні", kind: "code" },
  games: { note: "Від ідеї до гри, в яку грають друзі", kind: "start" },
};

const STEPS = [
  ["01", "Обираєш курс", "Від Scratch і Minecraft до Python, Unity та React. Перші 2 уроки — безкоштовно."],
  ["02", "Крок за кроком", "Наступний урок відкривається після попереднього: теорія, практика й домашка."],
  ["03", "Домашка з нагадуванням", "Дедлайн і нагадування батькам на пошту, а в Преміумі — перевірка викладачем."],
  ["04", "Рівні й бейджі", "XP, бейджі та серія днів мотивують, а за пройдений курс — сертифікат."],
];

export default async function HomePage() {
  const courses = await db.select().from(schema.courses).orderBy(asc(schema.courses.sortOrder));
  const groups: CatalogGroup[] = Object.keys(CATEGORY_LABELS)
    .map((cat) => {
      const list = courses.filter((c) => c.category === cat);
      if (!list.length) return null;
      return {
        id: cat,
        title: CATEGORY_LABELS[cat],
        age: `${Math.min(...list.map((c) => c.ageFrom))}–${Math.max(...list.map((c) => c.ageTo))} років`,
        note: GROUP_META[cat].note,
        kind: GROUP_META[cat].kind,
        courses: list.map((c) => ({ slug: c.slug, title: c.title, published: c.status === "published" })),
      };
    })
    .filter((g): g is CatalogGroup => g !== null);

  return (
    <PublicShell>
      {/* Hero */}
      <section className="mx-auto grid max-w-[1200px] gap-16 px-4 pt-16 pb-10 md:px-6 lg:grid-cols-2 lg:pt-[72px]">
        <div className="flex flex-col gap-7">
          <div className="flex h-[34px] items-center gap-2 self-start rounded-full border border-line px-3.5 text-sm text-muted">
            <span className="h-2 w-2 rounded-full bg-accent" />
            Для дітей 9–17 років · онлайн, у своєму темпі
          </div>
          <h1 className="font-display text-4xl leading-[1.12] font-bold tracking-tight md:text-[52px]">
            Місце, де діти стають <span className="text-accent">творцями</span> своїх ідей та технологій
          </h1>
          <p className="max-w-[540px] text-xl leading-relaxed text-soft">
            Програмування, дизайн і геймдев за нашою програмою: уроки крок за кроком, домашки з нагадуваннями та рівні, як у грі.
            Батьки бачать увесь прогрес.
          </p>
          <div className="mt-2 flex flex-wrap gap-3.5">
            <Link href="/register" className="btn-primary h-14 px-7 text-lg">
              Спробувати 2 уроки безкоштовно <IconArrow />
            </Link>
            <Link href="#courses" className="btn-ghost h-14 px-6 text-lg">
              Обрати курс
            </Link>
          </div>
          <p className="text-sm text-muted">Без картки · перші 2 уроки будь-якого курсу</p>
        </div>

        {/* Ілюстрація: "картка прогресу" з макета */}
        <div className="relative hidden min-h-[500px] lg:block" aria-hidden>
          <div className="card absolute top-2.5 left-10 flex w-[500px] flex-col gap-5 p-7">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[13px] text-muted">Курс · Python</span>
                <span className="font-display text-xl font-bold">Рівень 4 · Дослідник</span>
              </div>
              <div className="flex h-10 items-center gap-1.5 rounded-xl bg-[#2a2340] px-3 font-bold text-amber">
                <IconFlame size={18} /> 7 днів поспіль
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-[13px] text-muted">
                <span>XP до рівня 5</span>
                <span className="font-mono">640 / 800</span>
              </div>
              <div className="h-3 overflow-hidden rounded-md bg-[#262b52]">
                <div className="h-3 w-4/5 rounded-md bg-accent" />
              </div>
            </div>
            <div className="rounded-2xl bg-ink p-4 font-mono text-sm leading-7 text-soft">
              <div>
                <span className="text-violet">for</span> level <span className="text-violet">in</span> range(1, 6):
              </div>
              <div>
                {"    "}print(<span className="text-amber">&quot;Новий рівень!&quot;</span>, level)
              </div>
            </div>
            <div className="flex gap-2.5 text-sm font-semibold">
              <div className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-surface-2">
                <IconCheck size={18} className="text-accent" /> Урок 5 пройдено
              </div>
              <div className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-surface-2">
                <IconClock size={18} className="text-amber" /> Домашка до п’ятниці
              </div>
            </div>
          </div>
          <div className="absolute top-[400px] left-0 flex w-[250px] items-center gap-3 rounded-[18px] border border-line-2 bg-surface-2 px-4 py-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2a2340] text-amber">
              <IconStar size={22} />
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] text-muted">Новий бейдж</span>
              <span className="font-bold">Майстер циклів</span>
            </div>
          </div>
          <div className="absolute top-[380px] left-[330px] flex w-[230px] flex-col gap-1 rounded-[18px] border border-line-2 bg-surface-2 px-4 py-4">
            <span className="text-[13px] text-muted">Звіт для батьків</span>
            <span className="font-bold">3 уроки й 2 домашки за тиждень</span>
          </div>
        </div>
      </section>

      {/* Як навчаємось */}
      <section id="how" className="mx-auto flex max-w-[1200px] flex-col gap-9 px-4 pt-10 pb-[72px] md:px-6">
        <h2 className="font-display text-4xl font-bold">Як навчаємось</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([n, title, text]) => (
            <div key={n} className="card flex flex-col gap-3.5 p-7">
              <span className="font-mono text-[15px] text-accent">{n}</span>
              <h3 className="text-[21px] font-bold">{title}</h3>
              <p className="leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Курси */}
      <section id="courses" className="bg-deep">
        <div className="mx-auto max-w-[1200px] px-4 py-[72px] md:px-6">
          <CourseCatalog groups={groups} />
        </div>
      </section>

      {/* Для батьків */}
      <section id="parents" className="mx-auto grid max-w-[1200px] items-center gap-16 px-4 py-20 md:px-6 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <h2 className="font-display text-4xl leading-tight font-bold">Дитина навчається — батьки бачать усе</h2>
          <p className="text-lg leading-relaxed text-soft">
            Один кабінет на двох: дитина проходить уроки, а ви перевіряєте прогрес, домашки й оплату. Дитина нічого не оплачує сама.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["Прогрес", "Пройдені уроки, рівень і серія днів"],
            ["Домашки", "Що здано, що чекає, коментарі викладача"],
            ["Нагадування", "Лист перед дедлайном домашки і перед списанням"],
            ["Безпечно", "Мінімум даних дитини, видалення в один клік"],
          ].map(([t, d]) => (
            <div key={t} className="card flex flex-col gap-2 p-6">
              <span className="text-lg font-bold">{t}</span>
              <span className="leading-relaxed text-muted">{d}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Тарифи */}
      <section className="mx-auto max-w-[1200px] px-4 pb-20 md:px-6">
        <div className="flex flex-col items-start justify-between gap-6 rounded-[28px] border border-line-2 bg-surface px-8 py-12 md:flex-row md:items-center md:px-14">
          <div className="flex flex-col gap-2.5">
            <h2 className="font-display text-[28px] font-bold">Три тарифи — від одного курсу до викладача</h2>
            <p className="text-lg text-muted">Простий · Середній · Преміум. Оплата щомісяця через WayForPay, скасування в один клік.</p>
          </div>
          <Link href="/pricing" className="btn-primary h-14 shrink-0 px-7 text-lg">
            Порівняти тарифи
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
