import Link from "next/link";
import { logout } from "@/actions/auth";
import { Logo } from "@/components/site-chrome";

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
      <aside className="flex flex-col gap-7 border-b border-[#242955] bg-deep px-5 py-6 lg:sticky lg:top-0 lg:h-screen lg:w-[272px] lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="px-2">
          <Logo small />
        </div>
        <nav className="flex flex-row flex-wrap gap-1 lg:flex-col" aria-label="Меню кабінету">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="flex h-11 items-center rounded-[10px] px-3.5 font-semibold text-muted hover:bg-surface-2 hover:text-text">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-3 rounded-2xl bg-surface-2 p-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2e3a2e] font-bold text-accent">
            {user.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-semibold">{user.name}</span>
            <span className="text-[13px] text-muted">{roleLabel}</span>
          </div>
          <form action={logout}>
            <button className="text-sm text-muted hover:text-text" aria-label="Вийти з кабінету">
              Вийти
            </button>
          </form>
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col gap-7 px-4 py-8 md:px-12 md:py-9">{children}</main>
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "success" | "warn"; children: React.ReactNode }) {
  const cls =
    tone === "success" ? "border-accent/50 bg-[#1b2a2a]" : tone === "warn" ? "border-amber/50 bg-[#2a2414]" : "border-line-2 bg-surface-2";
  return <div className={`rounded-2xl border px-5 py-4 leading-relaxed ${cls}`}>{children}</div>;
}

export function StatusBadge({ tone, children }: { tone: "good" | "wait" | "muted" | "bad"; children: React.ReactNode }) {
  const cls = {
    good: "bg-[#1f3029] text-accent",
    wait: "bg-[#3a2e14] text-amber",
    muted: "bg-surface-2 text-muted",
    bad: "bg-danger/10 text-danger",
  }[tone];
  return <span className={`inline-flex h-7.5 shrink-0 items-center rounded-full px-3 text-[13px] font-bold ${cls}`}>{children}</span>;
}
