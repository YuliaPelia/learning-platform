import Link from "next/link";
import { prisma } from "@/db";
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
  const courses = await prisma.course.findMany({ orderBy: { sortOrder: "asc" } });
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
      <section className="mx-auto max-w-[1240px] px-4 pt-2 md:px-6">
        <div className="bg-brand relative overflow-hidden rounded-[36px] text-white md:rounded-[48px]">
          {/* Декоративні світлові плями */}
          <div aria-hidden className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute right-10 -bottom-20 h-80 w-80 rounded-full bg-pink/50 blur-3xl" />

          <div className="relative grid items-center gap-10 px-6 pt-12 pb-32 md:px-14 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:pb-36">
            <div className="flex flex-col gap-7">
              <div className="flex h-[34px] items-center gap-2 self-start rounded-full border border-white/30 bg-white/15 px-3.5 text-sm backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-white" />
                Для дітей 9–17 років · онлайн, у своєму темпі
              </div>
              <h1 className="font-display text-4xl leading-[1.12] font-bold tracking-tight md:text-[50px]">
                Місце, де діти стають <span className="rounded-2xl bg-white/20 px-2 backdrop-blur">творцями</span> своїх ідей та технологій
              </h1>
              <p className="max-w-[540px] text-lg leading-relaxed text-white/85 md:text-xl">
                Програмування, дизайн і геймдев за нашою програмою: уроки крок за кроком, домашки з нагадуваннями та рівні, як у грі.
                Батьки бачать увесь прогрес.
              </p>
              <div className="mt-2 flex flex-wrap gap-3.5">
                <Link
                  href="/register"
                  className="btn h-14 bg-white px-7 text-lg text-accent shadow-xl shadow-[#2d1a8c]/30 hover:-translate-y-0.5 hover:bg-white/95"
                >
                  Спробувати 2 уроки безкоштовно <IconArrow />
                </Link>
                <Link href="#courses" className="btn h-14 border border-white/50 px-6 text-lg text-white hover:bg-white/15">
                  Обрати курс
                </Link>
              </div>
              <p className="text-sm text-white/75">Без картки · перші 2 уроки будь-якого курсу</p>
            </div>

            {/* Ілюстрація: орбіта з карткою прогресу */}
            <div className="relative mx-auto hidden h-[470px] w-full max-w-[520px] lg:block" aria-hidden>
              <div className="absolute inset-4 rounded-full border border-white/25" />
              <div className="absolute inset-14 rounded-full border border-dashed border-white/30" />
              <div className="absolute inset-[88px] rounded-full bg-white/10 blur-sm" />

              {[
                ["top-2 left-[46%]", IconStar, "text-amber"],
                ["top-[96px] right-2", IconFlame, "text-pink"],
                ["bottom-[84px] right-6", IconCheck, "text-good"],
                ["bottom-4 left-[40%]", IconClock, "text-accent"],
                ["bottom-[110px] left-0", IconStar, "text-accent"],
                ["top-[110px] left-1", IconCheck, "text-pink"],
              ].map(([pos, Icon, color], i) => {
                const I = Icon as typeof IconStar;
                return (
                  <div
                    key={i}
                    className={`absolute ${pos} flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-lg shadow-[#2d1a8c]/25 ${color}`}
                  >
                    <I size={22} />
                  </div>
                );
              })}

              <div className="absolute top-[70px] left-1/2 flex w-[330px] -translate-x-1/2 flex-col gap-4 rounded-[28px] bg-white p-6 text-text shadow-2xl shadow-[#2d1a8c]/35">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted">Курс · Python</span>
                    <span className="font-display text-base font-bold">Рівень 4 · Дослідник</span>
                  </div>
                  <div className="flex h-9 items-center gap-1 rounded-full bg-amber/15 px-2.5 text-sm font-bold text-amber">
                    <IconFlame size={16} /> 7
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs text-muted">
                    <span>XP до рівня 5</span>
                    <span className="font-mono">640 / 800</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-line">
                    <div className="bg-brand h-full w-4/5 rounded-full" />
                  </div>
                </div>
                <div className="rounded-2xl bg-ink p-3.5 font-mono text-[13px] leading-6 text-soft">
                  <div>
                    <span className="text-violet">for</span> level <span className="text-violet">in</span> range(1, 6):
                  </div>
                  <div>
                    {"    "}print(<span className="text-amber">&quot;Новий рівень!&quot;</span>, level)
                  </div>
                </div>
                <div className="flex gap-2 text-[13px] font-semibold">
                  <div className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-good/10 text-good">
                    <IconCheck size={16} /> Урок 5
                  </div>
                  <div className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-amber/15 text-amber">
                    <IconClock size={16} /> До п’ятниці
                  </div>
                </div>
              </div>

              <div className="absolute bottom-[34px] left-[-6px] flex w-[220px] items-center gap-3 rounded-3xl bg-white/95 px-4 py-3 text-text shadow-xl shadow-[#2d1a8c]/25">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber/15 text-amber">
                  <IconStar size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted">Новий бейдж</span>
                  <span className="text-sm font-bold">Майстер циклів</span>
                </div>
              </div>
              <div className="absolute right-[-6px] bottom-[-6px] flex w-[210px] flex-col gap-0.5 rounded-3xl bg-white/95 px-4 py-3 text-text shadow-xl shadow-[#2d1a8c]/25">
                <span className="text-xs text-muted">Звіт для батьків</span>
                <span className="text-sm font-bold">3 уроки й 2 домашки за тиждень</span>
              </div>
            </div>
          </div>

          {/* Хвиля внизу, як на макеті */}
          <svg aria-hidden viewBox="0 0 1440 120" preserveAspectRatio="none" className="absolute inset-x-0 -bottom-px h-20 w-full md:h-28">
            <path d="M0 70 C 240 130, 480 0, 760 40 S 1240 120, 1440 50 L1440 120 L0 120 Z" fill="var(--color-ink)" />
          </svg>
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
