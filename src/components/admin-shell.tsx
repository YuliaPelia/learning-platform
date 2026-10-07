import { CabinetShell } from "@/components/cabinet-shell";

const NAV = [
  { href: "/admin", label: "Курси" },
  { href: "/admin/courses/new", label: "Новий курс" },
];

export function AdminShell({ user, children }: { user: { name: string }; children: React.ReactNode }) {
  return (
    <CabinetShell nav={NAV} user={user} roleLabel="Адміністратор">
      {children}
    </CabinetShell>
  );
}
