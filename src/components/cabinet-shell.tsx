import { logout } from "@/actions/auth";
import { Logo } from "@/components/site-chrome";
import { NavPills } from "@/components/nav-pills";

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
    <div className="min-h-screen bg-ink p-0 lg:p-3">
      {/* «Полотно» застосунку: велика заокруглена світла панель на сірому фоні, як на референсі */}
      <div className="flex min-h-screen flex-col bg-canvas lg:min-h-[calc(100vh-1.5rem)] lg:rounded-[40px] lg:shadow-soft">
        <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/85 backdrop-blur-xl lg:static lg:rounded-t-[40px] lg:border-0 lg:bg-transparent lg:backdrop-blur-none">
          <div className="flex flex-col gap-3 px-4 pt-3.5 pb-2.5 md:px-8 lg:flex-row lg:items-center lg:gap-6 lg:pt-6 lg:pb-2">
            <div className="flex items-center justify-between gap-3 lg:contents">
              <div className="flex items-center gap-3 lg:w-[200px] lg:shrink-0">
                <Logo small mark />
              </div>
              <div className="flex items-center gap-2 lg:order-3 lg:ml-auto">
                <div className="flex items-center gap-2.5 rounded-full border border-line bg-white py-1 pr-1 pl-1 shadow-pill sm:pr-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-iris font-bold text-white" aria-hidden>
                    {user.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="hidden flex-col leading-tight sm:flex">
                    <span className="max-w-[140px] truncate text-sm font-bold">{user.name}</span>
                    <span className="text-xs text-muted">{roleLabel}</span>
                  </span>
                </div>
                <form action={logout}>
                  <button className="icon-btn hover:text-danger" aria-label="Вийти з кабінету" title="Вийти">
                    <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4.5 w-4.5">
                      <path d="M8 4H5.5A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8M12 6.5 15.5 10 12 13.5M15.5 10H8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
            <div className="min-w-0 rounded-full lg:order-2 lg:bg-surface-2/80 lg:p-1">
              <NavPills nav={nav} label="Меню кабінету" />
            </div>
          </div>
        </header>
        <main className="flex min-w-0 flex-1 flex-col gap-6 px-4 pt-5 pb-10 md:px-8 md:pt-6">{children}</main>
      </div>
    </div>
  );
}

export function StatusBadge({ tone, children }: { tone: "good" | "wait" | "muted" | "bad"; children: React.ReactNode }) {
  const cls = {
    good: "bg-good/10 text-good",
    wait: "bg-amber/15 text-amber",
    muted: "bg-surface-2 text-soft",
    bad: "bg-danger/10 text-danger",
  }[tone];
  return <span className={`inline-flex h-7.5 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold whitespace-nowrap ${cls}`}>{children}</span>;
}
