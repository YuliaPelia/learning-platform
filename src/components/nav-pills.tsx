"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavItem = { href: string; label: string };

/**
 * Горизонтальні «таблетки» навігації кабінету: активна — чорна, як «Dashboard» на референсі.
 * Активною вважаємо збіг шляху й якоря (#schedule); пункт без якоря — активний, коли якоря немає.
 */
export function NavPills({ nav, label }: { nav: NavItem[]; label: string }) {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [pathname]);

  const isActive = (href: string) => {
    const [path, anchor] = href.split("#");
    if (anchor) return path === pathname && hash === `#${anchor}`;
    if (path !== pathname) return false;
    // пункт без якоря активний лише коли жоден «якірний» пункт цієї ж сторінки не обраний
    return !hash || !nav.some((n) => n.href === `${path}${hash}`);
  };

  return (
    <nav
      aria-label={label}
      className="-mx-4 flex gap-1.5 overflow-x-auto px-4 py-1 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {nav.map((n) => {
        const active = isActive(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            onClick={() => setHash(n.href.includes("#") ? `#${n.href.split("#")[1]}` : "")}
            className={`inline-flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors ${
              active ? "bg-text text-white shadow-pill" : "text-soft hover:bg-white hover:text-text"
            }`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
