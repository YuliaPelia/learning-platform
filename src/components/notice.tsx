import type { ReactNode } from "react";

export function Notice({ tone = "info", children }: { tone?: "info" | "success" | "warn"; children: ReactNode }) {
  const cls =
    tone === "success" ? "border-good/40 bg-good/10" : tone === "warn" ? "border-amber/50 bg-amber/15" : "border-line-2 bg-surface-2";
  return <div className={`rounded-2xl border px-5 py-4 leading-relaxed ${cls}`}>{children}</div>;
}
