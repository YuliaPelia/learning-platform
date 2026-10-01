import Link from "next/link";
import { logout } from "@/actions/auth";
import { getCurrentUser, homeFor } from "@/lib/dal";

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <Link href="/" className="flex flex-col gap-0.5" aria-label="ITCodeCraft — на головну">
      <span className={`font-display font-bold tracking-tight ${small ? "text-lg" : "text-[22px]"}`}>
        IT<span className="text-accent">Code</span>Craft
      </span>
      <span className="text-[10px] tracking-[3px] text-muted">IT SCHOOL · ONLINE</span>
    </Link>
  );
}

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="border-b border-[#242955]">
      <div className="mx-auto flex h-[88px] max-w-[1200px] items-center justify-between gap-6 px-4 md:px-6">
        <Logo />
        <nav className="hidden gap-9 font-medium text-soft lg:flex" aria-label="Головне меню">
          <Link href="/#courses" className="hover:text-text">Курси</Link>
          <Link href="/#how" className="hover:text-text">Як навчаємось</Link>
          <Link href="/#parents" className="hover:text-text">Для батьків</Link>
          <Link href="/pricing" className="hover:text-text">Тарифи</Link>
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link href={homeFor(user.role)} className="btn-ghost h-11">Кабінет</Link>
              <form action={logout}>
                <button className="h-11 px-2 text-sm text-muted hover:text-text">Вийти</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost h-11">Увійти</Link>
              <Link href="/register" className="btn-primary hidden h-11 sm:inline-flex">2 уроки безкоштовно</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-[#242955]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-10 text-sm text-muted md:flex-row md:items-center md:justify-between md:px-6">
        <span>© ITCodeCraft · ФОП [ПІБ], РНОКПП [номер]</span>
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
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
