import { CabinetShell } from "@/components/cabinet-shell";

const NAV = [
  { href: "/teacher", label: "Перевірка домашок" },
  { href: "/teacher/messages", label: "Листування" },
];

export function TeacherShell({ user, children }: { user: { name: string }; children: React.ReactNode }) {
  return (
    <CabinetShell nav={NAV} user={user} roleLabel="Викладач">
      {children}
    </CabinetShell>
  );
}
