import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";
import { logout } from "@/actions/auth";
import { getCurrentUser, homeFor } from "@/lib/dal";

export function Logo({ small = false, mark = false }: { small?: boolean; /** показати знак ліворуч від назви */ mark?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="ITCodeCraft — на головну">
      {mark && <LogoMark size={small ? 36 : 40} />}
      {/* inline-flex: колонка завширшки з назву, підпис розтягується рівно під нею */}
      <span className="inline-flex flex-col gap-1">
        <span className={`font-display leading-none font-extrabold tracking-tight ${small ? "text-lg" : "text-lg min-[380px]:text-xl sm:text-[21px]"}`}>
          IT<span className="text-accent">Code</span>Craft
        </span>
        {/* Розрядку підібрано так, щоб підпис був рівно завширшки з назву на кожному розмірі шрифту */}
        <span
          className={`-mr-[0.25em] text-[9px] leading-none font-semibold whitespace-nowrap text-faint ${small ? "tracking-[0.14em]" : "tracking-[0.14em] min-[380px]:tracking-[0.21em] sm:tracking-[0.25em]"}`}
          aria-hidden
        >
          IT SCHOOL · ONLINE
        </span>
      </span>
    </Link>
  );
}

const MENU = [
  ["/#courses", "Курси"],
  ["/#how", "Як навчаємось"],
  ["/#parents", "Для батьків"],
  ["/pricing", "Тарифи"],
] as const;

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 md:px-6">
      {/* Плаваюча біла «таблетка»-шапка */}
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-3 rounded-full border border-white/80 bg-white/85 pr-2 pl-5 shadow-soft backdrop-blur-xl md:h-[72px] md:pr-3 md:pl-7">
        <Logo mark />
        <nav className="hidden items-center gap-1 rounded-full bg-surface-2 p-1 lg:flex" aria-label="Головне меню">
          {MENU.map(([href, label]) => (
            <Link key={href} href={href} className="inline-flex h-10 items-center rounded-full px-4.5 text-sm font-semibold text-soft transition-colors hover:bg-white hover:text-text hover:shadow-pill">
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {user ? (
            <>
              <Link href={homeFor(user.role)} className="btn-primary h-11 px-4 sm:px-5">
                Кабінет
              </Link>
              <form action={logout}>
                <button className="icon-btn h-11 w-11 hover:text-danger" aria-label="Вийти" title="Вийти">
                  <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4.5 w-4.5">
                    <path d="M8 4H5.5A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8M12 6.5 15.5 10 12 13.5M15.5 10H8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost h-11 px-4 shadow-none sm:px-5">Увійти</Link>
              <Link href="/register" className="btn-primary hidden h-11 px-5 sm:inline-flex">2 уроки безкоштовно</Link>
            </>
          )}
        </div>
      </div>
      {/* На вузьких екранах головне меню — горизонтальна смуга під шапкою (без JS) */}
      <nav
        className="mx-auto mt-2 flex max-w-[1240px] gap-1.5 overflow-x-auto px-1 text-sm font-semibold [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
        aria-label="Головне меню (мобільне)"
      >
        {MENU.map(([href, label]) => (
          <Link key={href} href={href} className="chip h-9 bg-white/85 backdrop-blur">
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="px-3 pb-3 md:px-6 md:pb-6">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-4 rounded-(--radius-card) bg-white px-6 py-8 text-sm text-muted shadow-soft md:flex-row md:items-center md:justify-between md:px-9">
        <span>
          © ITCodeCraft · ФОП Войціховська Надія Валентинівна, ІПН 2599110948
          {" · "}
          <a href="mailto:itcodecraft@gmail.com" className="hover:text-text">
            itcodecraft@gmail.com
          </a>
        </span>
        <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Документи">
          <Link href="/legal/oferta" className="hover:text-text">Публічна оферта</Link>
          <Link href="/legal/privacy" className="hover:text-text">Політика конфіденційності</Link>
          <Link href="/legal/refund" className="hover:text-text">Повернення коштів</Link>
          <Link href="/legal/terms" className="hover:text-text">Правила користування</Link>
          <Link href="/legal/contacts" className="hover:text-text">Контакти</Link>
        </nav>
      </div>
    </footer>
  );
}

export async function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 pb-6">{children}</main>
      <SiteFooter />
    </div>
  );
}
