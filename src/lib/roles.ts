/** Яка роль має доступ до яких розділів. Чиста функція — використовує proxy і тести. */
export type AppRole = "parent" | "student" | "teacher" | "admin";

const RULES: { prefix: string; role: AppRole }[] = [
  { prefix: "/cabinet/parent", role: "parent" },
  { prefix: "/cabinet/student", role: "student" },
  { prefix: "/checkout", role: "parent" },
  { prefix: "/teacher", role: "teacher" },
  { prefix: "/admin", role: "admin" },
];

/** Роль, якої вимагає шлях (null — підійде будь-яка авторизована). */
export function requiredRole(pathname: string): AppRole | null {
  const rule = RULES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
  return rule?.role ?? null;
}

export function canAccess(role: string, pathname: string): boolean {
  const need = requiredRole(pathname);
  return !need || need === role;
}

export function homePath(role: string) {
  if (role === "parent") return "/cabinet/parent";
  if (role === "student") return "/cabinet/student";
  if (role === "teacher") return "/teacher";
  if (role === "admin") return "/admin";
  return "/";
}
