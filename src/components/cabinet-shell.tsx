import Link from "next/link";
import { logout } from "@/actions/auth";
import { Logo } from "@/components/site-chrome";

export { Notice } from "@/components/notice";

type NavItem = { href: string; label: string };

export function CabinetShell({
  nav,
  user,
  roleLabel,
  children,
}: {
  nav: NavItem[];
  user: { name: string };
  roleLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-3 border-b border-line bg-deep px-4 py-4 lg:flex lg:flex-col lg:items-stretch lg:gap-7 lg:px-5 lg:py-6 lg:sticky lg:top-0 lg:h-screen lg:w-[272px] lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="px-0 lg:px-2">
          <Logo small />
        </div>
        <nav className="col-span-2 row-start-2 -mx-4 flex flex-row gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden" aria-label="Меню кабінету">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="flex h-10 shrink-0 items-center rounded-full border border-line bg-white/70 px-4 text-sm font-semibold whitespace-nowrap text-muted hover:bg-surface-2 hover:text-text lg:h-11 lg:rounded-[10px] lg:border-0 lg:bg-transparent lg:px-3.5 lg:text-base">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="col-start-2 row-start-1 flex items-center gap-2 rounded-2xl bg-surface-2 p-2 lg:mt-auto lg:gap-3 lg:p-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 font-bold text-accent">
            {user.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="hidden min-w-0 flex-1 flex-col lg:flex">
            <span className="truncate font-semibold">{user.name}</span>
            <span className="text-[13px] text-muted">{roleLabel}</span>
          </div>
          <form action={logout}>
            <button className="group relative inline-flex cursor-pointer items-center gap-1.5 py-1 text-sm text-muted transition-colors duration-200 hover:text-accent focus-visible:text-accent after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-300 hover:after:scale-x-100 focus-visible:after:scale-x-100" aria-label="Вийти з кабінету">
              Вийти
              <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1 group-focus-visible:translate-x-1">
                <path d="M4 10h11m0 0-4-4m4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col gap-7 px-4 py-8 md:px-12 md:py-9">{children}</main>
    </div>
  );
}

export function StatusBadge({ tone, children }: { tone: "good" | "wait" | "muted" | "bad"; children: React.ReactNode }) {
  const cls = {
    good: "bg-good/10 text-good",
    wait: "bg-amber/15 text-amber",
    muted: "bg-surface-2 text-muted",
    bad: "bg-danger/10 text-danger",
  }[tone];
  return <span className={`inline-flex h-7.5 shrink-0 items-center rounded-full px-3 text-[13px] font-bold ${cls}`}>{children}</span>;
}
