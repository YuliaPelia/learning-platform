import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = { key: string; failures: number; windowStart: Date; lockedUntil: Date | null };
const { store, clientIp, userFindUnique, cookieSet, verifyPassword, redirect } = vi.hoisted(() => ({
  store: new Map<string, { key: string; failures: number; windowStart: Date; lockedUntil: Date | null }>(),
  clientIp: vi.fn(async (): Promise<string | null> => "1.1.1.1"),
  userFindUnique: vi.fn(),
  cookieSet: vi.fn(),
  verifyPassword: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error("REDIRECT:" + url);
  }),
}));

// Проста in-memory імітація таблиці login_attempts
const loginAttempt = {
  findMany: async ({ where }: { where: { key: { in: string[] } } }) => where.key.in.map((k) => store.get(k)).filter(Boolean) as Row[],
  findUnique: async ({ where }: { where: { key: string } }) => store.get(where.key) ?? null,
  upsert: async ({ where, create }: { where: { key: string }; create: Partial<Row> }) => {
    const row = { key: where.key, failures: 1, windowStart: create.windowStart!, lockedUntil: null };
    store.set(where.key, row);
    return row;
  },
  update: async ({ where, data }: { where: { key: string }; data: { failures?: { increment: number }; lockedUntil?: Date } }) => {
    const row = store.get(where.key)!;
    if (data.failures) row.failures += data.failures.increment;
    if (data.lockedUntil) row.lockedUntil = data.lockedUntil;
    return row;
  },
  deleteMany: async ({ where }: { where: { key?: string; windowStart?: { lt: Date }; OR?: unknown[] } }) => {
    if (where.key) {
      store.delete(where.key);
      return { count: 1 };
    }
    // Очищення протермінованих: вікно спливло й блокування знято
    const now = Date.now();
    let count = 0;
    for (const [k, r] of store) {
      if (r.windowStart < where.windowStart!.lt && (!r.lockedUntil || r.lockedUntil.getTime() < now)) {
        store.delete(k);
        count++;
      }
    }
    return { count };
  },
};

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({
  prisma: {
    loginAttempt: new Proxy({}, { get: (_t, k) => (loginAttempt as Record<string | symbol, unknown>)[k] }),
    user: { findUnique: userFindUnique },
  },
}));
vi.mock("@/lib/password", () => ({ verifyPassword, hashPassword: vi.fn() }));
vi.mock("@/lib/request", async (orig) => ({
  ...(await orig<typeof import("@/lib/request")>()),
  clientIp,
  requestMeta: async () => ({ ip: "1.1.1.1", userAgent: null }),
}));
vi.mock("@/lib/session", () => ({ createSession: vi.fn(), deleteSession: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: cookieSet }) }));

import { login } from "@/actions/auth";
import { clientIpFrom, trustProxyHeaders } from "@/lib/request";
import { LoginSchema } from "@/lib/validation";
import { LOGIN_LIMITS, deleteExpiredAttempts, ipKey, loginKey, lockedMinutes, recordFailure, resetFailures } from "@/lib/rate-limit";
import { canAccess, requiredRole } from "@/lib/roles";

const form = (f: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(f)) fd.set(k, v);
  return fd;
};

describe("rate limiting входу", () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  it("блокує після maxPerLogin невдалих спроб", async () => {
    const t = new Date("2026-01-01T10:00:00Z");
    for (let i = 0; i < LOGIN_LIMITS.maxPerLogin - 1; i++) await recordFailure("login:a", LOGIN_LIMITS.maxPerLogin, t);
    expect(await lockedMinutes(["login:a"], t)).toBe(0);
    await recordFailure("login:a", LOGIN_LIMITS.maxPerLogin, t);
    expect(await lockedMinutes(["login:a"], t)).toBe(15);
  });

  it("блокування спливає за часом, а вікно лічильника скидається", async () => {
    const t = new Date("2026-01-01T10:00:00Z");
    for (let i = 0; i < LOGIN_LIMITS.maxPerLogin; i++) await recordFailure("login:a", LOGIN_LIMITS.maxPerLogin, t);
    const later = new Date(t.getTime() + LOGIN_LIMITS.lockMs + 1000);
    expect(await lockedMinutes(["login:a"], later)).toBe(0);
    await recordFailure("login:a", LOGIN_LIMITS.maxPerLogin, later);
    expect(store.get("login:a")!.failures).toBe(1);
    expect(store.get("login:a")!.lockedUntil).toBeNull();
  });

  it("resetFailures скидає лічильник", async () => {
    await recordFailure("login:a", 5);
    await resetFailures("login:a");
    expect(store.has("login:a")).toBe(false);
  });

  it("login: після N невдач повертає повідомлення про блокування і не перевіряє пароль", async () => {
    userFindUnique.mockResolvedValue(null);
    for (let i = 0; i < LOGIN_LIMITS.maxPerLogin; i++) {
      const r = await login(undefined, form({ login: "kid", password: "x" }));
      expect(r?.error).toBe("Невірний логін або пароль");
    }
    userFindUnique.mockClear();
    const r = await login(undefined, form({ login: "kid", password: "x" }));
    expect(r?.error).toMatch(/Забагато невдалих спроб/);
    expect(userFindUnique).not.toHaveBeenCalled();
  });

  it("login: успішний вхід скидає лічильник логіна", async () => {
    userFindUnique.mockResolvedValue({ id: "u1", role: "student", passwordHash: "h" });
    verifyPassword.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await login(undefined, form({ login: "kid", password: "bad" }));
    expect(store.get(loginKey("kid"))?.failures).toBe(1);
    await expect(login(undefined, form({ login: "kid", password: "ok" }))).rejects.toThrow("REDIRECT:/cabinet/student");
    expect(store.has(loginKey("kid"))).toBe(false);
  });

  it("login: невалідні дані відхиляються zod до звернення до БД", async () => {
    const r = await login(undefined, form({ login: "", password: "" }));
    expect(r?.error).toBeTruthy();
    expect(userFindUnique).not.toHaveBeenCalled();
  });
});

describe("IP клієнта і ліміт за IP", () => {
  const hdr = (o: Record<string, string>) => ({ get: (n: string) => o[n] ?? null });

  it("без довіри до проксі заголовки ігноруються (підробка XFF не діє)", () => {
    expect(clientIpFrom(hdr({ "x-forwarded-for": "6.6.6.6" }), false)).toBeNull();
  });

  it("з довірою береться останнє значення XFF, а не підроблене перше", () => {
    expect(clientIpFrom(hdr({ "x-forwarded-for": "6.6.6.6, 2.2.2.2" }), true)).toBe("2.2.2.2");
    expect(clientIpFrom(hdr({ "x-real-ip": "3.3.3.3" }), true)).toBe("3.3.3.3");
    expect(clientIpFrom(hdr({}), true)).toBeNull();
  });

  it("trustProxyHeaders: явна змінна важливіша, на Vercel дефолт — довіряти", () => {
    expect(trustProxyHeaders({})).toBe(false);
    expect(trustProxyHeaders({ VERCEL: "1" })).toBe(true);
    expect(trustProxyHeaders({ VERCEL: "1", TRUST_PROXY_HEADERS: "0" })).toBe(false);
    expect(trustProxyHeaders({ TRUST_PROXY_HEADERS: "1" })).toBe(true);
  });

  it("невідомий IP: після багатьох невдач різних логінів вхід іншого логіна не блокується", async () => {
    clientIp.mockResolvedValue(null);
    userFindUnique.mockResolvedValue(null);
    for (let i = 0; i < LOGIN_LIMITS.maxPerIp + 1; i++) await login(undefined, form({ login: `user${i}`, password: "x" }));
    expect([...store.keys()].some((k) => k.startsWith("ip:"))).toBe(false);
    const r = await login(undefined, form({ login: "fresh", password: "x" }));
    expect(r?.error).toBe("Невірний логін або пароль");
    clientIp.mockResolvedValue("1.1.1.1");
  });

  it("відомий IP: ліміт за IP діє", async () => {
    userFindUnique.mockResolvedValue(null);
    for (let i = 0; i < LOGIN_LIMITS.maxPerIp; i++) await login(undefined, form({ login: `user${i}`, password: "x" }));
    const r = await login(undefined, form({ login: "fresh", password: "x" }));
    expect(r?.error).toMatch(/Забагато невдалих спроб/);
  });
});

describe("довгий логін і очищення", () => {
  beforeEach(() => store.clear());

  it("LoginSchema відхиляє логін довший за 100 символів", () => {
    expect(LoginSchema.safeParse({ login: "a".repeat(101), password: "x" }).success).toBe(false);
    expect(LoginSchema.safeParse({ login: "a".repeat(100), password: "x" }).success).toBe(true);
  });

  it("ключі нормалізуються й мають обмежену довжину", () => {
    expect(loginKey("  KiD ")).toBe("login:kid");
    expect(loginKey("a".repeat(500)).length).toBeLessThanOrEqual(106);
    expect(ipKey("x".repeat(500)).length).toBeLessThanOrEqual(67);
  });

  it("deleteExpiredAttempts видаляє лише протерміновані рядки", async () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const old = new Date(now.getTime() - LOGIN_LIMITS.windowMs - 1000);
    store.set("login:old", { key: "login:old", failures: 2, windowStart: old, lockedUntil: null });
    store.set("login:fresh", { key: "login:fresh", failures: 1, windowStart: now, lockedUntil: null });
    store.set("login:locked", { key: "login:locked", failures: 5, windowStart: old, lockedUntil: new Date(Date.now() + 60_000) });
    expect(await deleteExpiredAttempts(now)).toBe(1);
    expect([...store.keys()].sort()).toEqual(["login:fresh", "login:locked"]);
  });
});

describe("ролі", () => {
  it("дитина не потрапляє в кабінет батьків і навпаки", () => {
    expect(canAccess("student", "/cabinet/parent")).toBe(false);
    expect(canAccess("parent", "/cabinet/student")).toBe(false);
    expect(canAccess("parent", "/cabinet/parent")).toBe(true);
    expect(canAccess("student", "/cabinet/student")).toBe(true);
  });

  it("checkout, teacher, admin закриті для чужих ролей", () => {
    expect(canAccess("student", "/checkout/abc")).toBe(false);
    expect(canAccess("parent", "/teacher/messages")).toBe(false);
    expect(canAccess("teacher", "/admin")).toBe(false);
    expect(canAccess("admin", "/admin/courses/new")).toBe(true);
  });

  it("/learn і /cabinet доступні будь-якій ролі; схожі префікси не збігаються", () => {
    expect(requiredRole("/learn/python/1")).toBeNull();
    expect(canAccess("student", "/cabinet")).toBe(true);
    expect(requiredRole("/administrator")).toBeNull();
  });
});

describe("cookie сесії і server actions", () => {
  it("createSession ставить httpOnly, sameSite і secure у production", async () => {
    process.env.SESSION_SECRET = "x".repeat(40);
    vi.stubEnv("NODE_ENV", "production");
    const { createSession } = await vi.importActual<typeof import("@/lib/session")>("@/lib/session");
    await createSession("u1", "parent");
    const opts = cookieSet.mock.calls[0][2];
    expect(opts).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    vi.unstubAllEnvs();
  });
});
