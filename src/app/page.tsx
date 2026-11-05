import Link from "next/link";
import { prisma } from "@/db";
import { CourseCatalog, type CatalogGroup } from "@/components/course-catalog";
import { IconArrow, IconCheck, IconClock, IconFlame, IconLock, IconStar } from "@/components/icons";
import { Mascot, MascotAvatar } from "@/components/mascot";
import { Reveal } from "@/components/reveal";
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
      {/* ── Hero: bento із привітанням і карткою-маскотом ── */}
      <section className="mx-auto grid max-w-[1240px] gap-4 px-3 pt-5 md:px-6 md:pt-6 lg:grid-cols-[1.05fr_1fr]">
        <div className="card relative flex flex-col justify-between gap-10 overflow-hidden p-7 sm:p-10 md:p-12">
          <div className="flex flex-col gap-6">
            <div className="anim-rise flex items-center gap-2 self-start rounded-full bg-surface-2 py-1.5 pr-4 pl-1.5 text-sm font-semibold text-soft">
              <span className="rounded-full bg-text px-2.5 py-0.5 text-xs text-white">9–17</span>
              онлайн, у своєму темпі
            </div>
            <h1 style={{ animationDelay: "0.08s" }} className="anim-rise font-display text-[34px] leading-[1.05] font-extrabold tracking-[-0.035em] sm:text-5xl md:text-[60px]">
              Місце, де діти стають{" "}
              <span className="relative inline-block">
                <span className="relative z-10">творцями</span>
                <span aria-hidden className="bg-iris absolute inset-x-[-4px] bottom-[0.08em] h-[0.32em] rounded-full opacity-70" />
              </span>{" "}
              своїх ідей
            </h1>
            <p style={{ animationDelay: "0.16s" }} className="anim-rise max-w-[520px] text-lg leading-relaxed text-muted">
              Програмування, дизайн і геймдев за нашою програмою: уроки крок за кроком, домашки з нагадуваннями та рівні, як у грі. Батьки бачать увесь прогрес.
            </p>
            <div style={{ animationDelay: "0.24s" }} className="anim-rise flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary h-14 w-full px-6 text-[15px] sm:w-auto sm:px-7 sm:text-base">
                Спробувати 2 уроки безкоштовно <IconArrow size={18} />
              </Link>
              <Link href="#courses" className="btn-ghost h-14 w-full px-7 text-base sm:w-auto">
                Обрати курс
              </Link>
            </div>
          </div>
          <dl style={{ animationDelay: "0.32s" }} className="anim-rise grid grid-cols-3 gap-2 sm:gap-3">
            {[
              ["2 уроки", "безкоштовно"],
              ["Без картки", "для старту"],
              ["XP і бейджі", "мотивують"],
            ].map(([v, l]) => (
              <div key={v} className="tile flex flex-col gap-0.5 px-3.5 py-3 sm:px-4">
                <dt className="order-2 text-xs text-muted sm:text-sm">{l}</dt>
                <dd className="text-sm font-bold sm:text-base">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Маскот у перламутровій картці + «віджети» прогресу поверх */}
        <div className="relative min-h-[420px] overflow-hidden rounded-(--radius-card) bg-[#efeafd] shadow-soft sm:min-h-[520px]" aria-hidden>
          <Mascot framed cover priority className="absolute inset-0 rounded-none" sizes="(min-width: 1024px) 620px, 100vw" />

          <div style={{ animationDelay: "0.4s" }} className="anim-rise absolute top-5 left-5 flex items-center gap-2 rounded-full bg-white/90 py-1.5 pr-3.5 pl-1.5 shadow-pill backdrop-blur">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber/15 text-amber"><IconFlame size={16} /></span>
            <span className="text-sm font-bold">7 днів поспіль</span>
          </div>
          <div style={{ animationDelay: "0.55s" }} className="anim-pop absolute top-5 right-5 hidden items-center gap-2.5 rounded-2xl bg-white/90 px-3 py-2.5 shadow-pill backdrop-blur sm:flex">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-text text-white"><IconStar size={17} /></span>
            <span className="flex flex-col leading-tight">
              <span className="text-[11px] text-muted">Новий бейдж</span>
              <span className="text-sm font-bold">Майстер циклів</span>
            </span>
          </div>

          <div style={{ animationDelay: "0.7s" }} className="anim-rise absolute inset-x-4 bottom-4 flex flex-col gap-3 rounded-[22px] bg-white/92 p-4 shadow-lift backdrop-blur-xl sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[300px] sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col">
                <span className="text-xs text-muted">Курс · Python</span>
                <span className="font-bold">Рівень 4 · Дослідник</span>
              </div>
              <span className="icon-btn h-8 w-8 shadow-none"><IconArrow size={14} className="-rotate-45" /></span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs text-muted">
                <span>XP до рівня 5</span>
                <span className="font-mono text-text">640 / 800</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                <div className="bg-iris anim-bar h-full w-4/5 rounded-full" />
              </div>
            </div>
            <div className="flex gap-2 text-xs font-semibold">
              <span className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-good/10 text-good"><IconCheck size={14} /> Урок 5</span>
              <span className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-surface-2 text-soft"><IconClock size={14} /> До п’ятниці</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Як навчаємось ── */}
      <section id="how" className="mx-auto flex max-w-[1240px] scroll-mt-28 flex-col gap-6 px-3 pt-16 md:px-6 md:pt-24">
        <Reveal className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <h2 className="font-display text-3xl font-extrabold sm:text-[42px]">Як навчаємось</h2>
          <p className="max-w-[420px] text-muted">Чотири кроки, які повторюються з кожним уроком — дитина завжди знає, що робити далі.</p>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([n, title, text], i) => (
            <Reveal key={n} delay={i * 80} className="card hover-lift flex flex-col gap-4 p-6">
              <div className="flex items-center justify-between">
                <span className={`flex h-11 w-11 items-center justify-center rounded-full font-mono text-sm font-bold ${i === 0 ? "bg-text text-white" : "bg-surface-2 text-soft"}`}>{n}</span>
                <span className="icon-btn h-9 w-9 shadow-none"><IconArrow size={14} className="-rotate-45" /></span>
              </div>
              <h3 className="text-xl font-bold">{title}</h3>
              <p className="leading-relaxed text-muted">{text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Курси ── */}
      <section id="courses" className="mx-auto max-w-[1240px] scroll-mt-28 px-3 pt-16 md:px-6 md:pt-24">
        <Reveal><CourseCatalog groups={groups} /></Reveal>
      </section>

      {/* ── Для батьків: «дашборд» батьківського кабінету ── */}
      <section id="parents" className="mx-auto grid max-w-[1240px] scroll-mt-28 gap-4 px-3 pt-16 md:px-6 md:pt-24 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal className="card flex flex-col justify-between gap-8 p-7 sm:p-10">
          <div className="flex flex-col gap-4">
            <span className="self-start rounded-full bg-surface-2 px-3.5 py-1.5 text-sm font-semibold text-soft">Для батьків</span>
            <h2 className="font-display text-3xl leading-[1.1] font-extrabold sm:text-[40px]">Дитина навчається — батьки бачать усе</h2>
            <p className="text-lg leading-relaxed text-muted">
              Один кабінет на двох: дитина проходить уроки, а ви перевіряєте прогрес, домашки й оплату. Дитина нічого не оплачує сама.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-[22px] bg-surface-2 p-3 pr-5">
            <MascotAvatar size={52} />
            <p className="text-sm leading-snug text-soft">
              <b className="text-text">Кодик:</b> «За день до дедлайну домашки я нагадаю батькам на пошту — нічого не загубиться»
            </p>
          </div>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["Прогрес", "Пройдені уроки, рівень і серія днів", IconFlame, "72%"],
            ["Домашки", "Що здано, що чекає, коментарі викладача", IconCheck, "5 / 6"],
            ["Нагадування", "Лист перед дедлайном домашки і перед списанням", IconClock, "за 1 день"],
            ["Безпечно", "Мінімум даних дитини, видалення в один клік", IconLock, "1 клік"],
          ].map(([t, d, Icon, metric], i) => {
            const I = Icon as typeof IconStar;
            return (
              <Reveal key={t as string} delay={i * 80} className="card hover-lift flex flex-col gap-5 p-6">
                <div className="flex items-center justify-between">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-full ${i === 0 ? "bg-iris text-white" : "bg-surface-2 text-soft"}`}>
                    <I size={19} />
                  </span>
                  <span className="font-mono text-sm font-semibold text-muted">{metric as string}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-lg font-bold">{t as string}</span>
                  <span className="leading-relaxed text-muted">{d as string}</span>
                </div>
                {i === 0 && (
                  <div className="mt-auto h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className="bg-iris h-full w-[72%] rounded-full" />
                  </div>
                )}
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ── Тарифи ── */}
      <section className="mx-auto max-w-[1240px] px-3 pt-16 pb-6 md:px-6 md:pt-24">
        <Reveal className="bg-pearl relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-(--radius-card) px-7 py-10 shadow-soft sm:px-10 md:flex-row md:items-center md:px-14 md:py-12">
          <div className="relative flex max-w-[640px] flex-col gap-3">
            <h2 className="font-display text-[28px] leading-tight font-extrabold sm:text-4xl">Три тарифи — від одного курсу до викладача</h2>
            <p className="text-lg text-soft">Простий · Середній · Преміум. Оплата щомісяця через WayForPay, скасування в один клік.</p>
          </div>
          <Link href="/pricing" className="btn-primary relative h-14 shrink-0 px-7 text-base">
            Порівняти тарифи <IconArrow size={18} />
          </Link>
        </Reveal>
      </section>
    </PublicShell>
  );
}
