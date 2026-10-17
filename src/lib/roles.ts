/** Яка роль має доступ до яких розділів. Чиста функція — використовує proxy і тести. */
export type AppRole = "parent" | "student" | "teacher" | "admin";

/** Конкретніші префікси — раніше загальних (/teacher/videos раніше /teacher). */
const RULES: { prefix: string; roles: AppRole[] }[] = [
  { prefix: "/cabinet/parent", roles: ["parent"] },
  { prefix: "/cabinet/student", roles: ["student"] },
  { prefix: "/checkout", roles: ["parent"] },
  { prefix: "/teacher/videos", roles: ["teacher", "admin"] },
  { prefix: "/teacher", roles: ["teacher"] },
  { prefix: "/admin", roles: ["admin"] },
];

/** Ролі, яким дозволено шлях (null — підійде будь-яка авторизована). */
export function allowedRoles(pathname: string): AppRole[] | null {
  const rule = RULES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
  return rule?.roles ?? null;
}

export function canAccess(role: string, pathname: string): boolean {
  const roles = allowedRoles(pathname);
  return !roles || roles.some((r) => r === role);
}

export function homePath(role: string) {
  if (role === "parent") return "/cabinet/parent";
  if (role === "student") return "/cabinet/student";
  if (role === "teacher") return "/teacher";
  if (role === "admin") return "/admin";
  return "/";
}
