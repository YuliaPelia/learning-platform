import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userFindUniqueOrThrow: vi.fn(),
  userUpdate: vi.fn(),
  rtCreate: vi.fn(),
  rtFindUnique: vi.fn(),
  rtUpdateMany: vi.fn(),
  verifyPassword: vi.fn(),
  lockedMinutes: vi.fn(async () => 0),
  recordFailure: vi.fn(),
  getCourseState: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({
  prisma: {
    user: { findUnique: m.userFindUnique, findUniqueOrThrow: m.userFindUniqueOrThrow, update: m.userUpdate },
    refreshToken: { create: m.rtCreate, findUnique: m.rtFindUnique, updateMany: m.rtUpdateMany },
  },
}));
vi.mock("@/lib/password", () => ({ verifyPassword: m.verifyPassword }));
vi.mock("@/lib/rate-limit", async (orig) => ({
  ...(await orig<typeof import("@/lib/rate-limit")>()),
  lockedMinutes: m.lockedMinutes,
  recordFailure: m.recordFailure,
  resetFailures: vi.fn(),
}));
vi.mock("@/lib/request", () => ({ clientIp: async () => null }));
vi.mock("@/lib/learning", () => ({ getCourseState: m.getCourseState }));

import { POST as loginPost } from "@/app/api/mobile/v1/auth/login/route";
import { GET as courseGet } from "@/app/api/mobile/v1/courses/[slug]/route";
import { GET as meGet } from "@/app/api/mobile/v1/me/route";
import { rotateRefreshToken, signAccessToken, verifyAccessToken } from "@/lib/mobile/tokens";
import { signInWithProvider } from "@/lib/mobile/social";

const req = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://x/api", { method: "POST", body: JSON.stringify(body), headers });
const user = (role: string, extra = {}) => ({ id: "u1", role, name: "Імʼя", email: "a@b.c", login: "a@b.c", birthYear: null, passwordHash: "h", ...extra });

beforeEach(() => {
  vi.clearAllMocks();
  process.env.MOBILE_JWT_SECRET = "m".repeat(40);
  m.rtCreate.mockResolvedValue({});
  m.rtUpdateMany.mockResolvedValue({ count: 1 });
  m.lockedMinutes.mockResolvedValue(0);
});

describe("access token", () => {
  it("підписаний токен повертає userId, а підроблений — null", async () => {
    const token = await signAccessToken("u1", "parent");
    expect(await verifyAccessToken(token)).toBe("u1");
    expect(await verifyAccessToken(token + "x")).toBeNull();
    process.env.MOBILE_JWT_SECRET = "z".repeat(40);
    expect(await verifyAccessToken(token)).toBeNull();
  });
});

describe("refresh token", () => {
  const row = (extra = {}) => ({ id: "r1", userId: "u1", user: user("student"), expiresAt: new Date(Date.now() + 1e6), revokedAt: null, ...extra });

  it("обмінює дійсний токен і відкликає старий", async () => {
    m.rtFindUnique.mockResolvedValue(row());
    const res = await rotateRefreshToken("tok");
    expect(res?.tokens.refreshToken).toBeTruthy();
    expect(m.rtUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "r1", revokedAt: null } }));
  });

  it("повторне використання відкликаного токена відкликає всі сесії користувача", async () => {
    m.rtFindUnique.mockResolvedValue(row({ revokedAt: new Date() }));
    expect(await rotateRefreshToken("tok")).toBeNull();
    expect(m.rtUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u1", revokedAt: null } }));
  });

  it("відхиляє прострочений і невідомий токен", async () => {
    m.rtFindUnique.mockResolvedValue(row({ expiresAt: new Date(Date.now() - 1) }));
    expect(await rotateRefreshToken("tok")).toBeNull();
    m.rtFindUnique.mockResolvedValue(null);
    expect(await rotateRefreshToken("tok")).toBeNull();
  });

  it("гонка двох запитів: програвший не отримує токенів", async () => {
    m.rtFindUnique.mockResolvedValue(row());
    m.rtUpdateMany.mockResolvedValue({ count: 0 });
    expect(await rotateRefreshToken("tok")).toBeNull();
  });
});

describe("POST /auth/login", () => {
  it("вхід учня за логіном", async () => {
    m.userFindUnique.mockResolvedValue(user("student", { login: "max" }));
    m.verifyPassword.mockResolvedValue(true);
    const res = await loginPost(req({ login: "max", password: "pass1234" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.accessToken).toBeTruthy();
    expect(json.user.passwordHash).toBeUndefined();
  });

  it("невірний пароль → 401 і запис невдалої спроби", async () => {
    m.userFindUnique.mockResolvedValue(user("parent"));
    m.verifyPassword.mockResolvedValue(false);
    const res = await loginPost(req({ login: "a@b.c", password: "bad" }));
    expect(res.status).toBe(401);
    expect(m.recordFailure).toHaveBeenCalled();
  });

  it("заблокований логін → 429 без перевірки пароля", async () => {
    m.lockedMinutes.mockResolvedValue(10);
    const res = await loginPost(req({ login: "a@b.c", password: "x" }));
    expect(res.status).toBe(429);
    expect(m.verifyPassword).not.toHaveBeenCalled();
  });

  it("викладач не може увійти в додаток → 403", async () => {
    m.userFindUnique.mockResolvedValue(user("teacher"));
    m.verifyPassword.mockResolvedValue(true);
    expect((await loginPost(req({ login: "teacher", password: "x" }))).status).toBe(403);
  });
});

describe("GET /me", () => {
  it("без токена → 401, з токеном → користувач", async () => {
    expect((await meGet(new Request("http://x/me"))).status).toBe(401);
    m.userFindUnique.mockResolvedValue(user("parent"));
    const token = await signAccessToken("u1", "parent");
    const res = await meGet(new Request("http://x/me", { headers: { authorization: `Bearer ${token}` } }));
    expect((await res.json()).user.role).toBe("parent");
  });
});

describe("GET /courses/[slug]", () => {
  const state = {
    course: { slug: "python", title: "Python", description: "", category: "code", ageFrom: 9, ageTo: 12, status: "published" },
    completedCount: 1,
    items: [
      { lesson: { order: 1, title: "A", summary: "", type: "text", xp: 100 }, done: true, access: "ok" },
      { lesson: { order: 3, title: "C", summary: "", type: "text", xp: 100 }, done: false, access: "needs_subscription" },
    ],
  };
  const call = (headers = {}) => courseGet(new Request("http://x/c", { headers }) as never, { params: Promise.resolve({ slug: "python" }) } as never);

  it("гість бачить теми з access=login_required", async () => {
    m.getCourseState.mockResolvedValue(state);
    const json = await (await call()).json();
    expect(m.getCourseState).toHaveBeenCalledWith("python", null);
    expect(json.lessons.map((l: { access: string }) => l.access)).toEqual(["login_required", "login_required"]);
    expect(json.lessons.map((l: { free: boolean }) => l.free)).toEqual([true, false]);
  });

  it("учень отримує реальний стан доступу", async () => {
    m.getCourseState.mockResolvedValue(state);
    m.userFindUnique.mockResolvedValue(user("student"));
    const token = await signAccessToken("u1", "student");
    const json = await (await call({ authorization: `Bearer ${token}` })).json();
    expect(m.getCourseState).toHaveBeenCalledWith("python", "u1");
    expect(json.lessons.map((l: { access: string }) => l.access)).toEqual(["ok", "needs_subscription"]);
  });

  it("батько: теми видно, але access=student_only; прогрес не рахуємо", async () => {
    m.getCourseState.mockResolvedValue(state);
    m.userFindUnique.mockResolvedValue(user("parent"));
    const token = await signAccessToken("u1", "parent");
    const json = await (await call({ authorization: `Bearer ${token}` })).json();
    expect(m.getCourseState).toHaveBeenCalledWith("python", null);
    expect(json.lessons[0].access).toBe("student_only");
    expect(json.course.completedCount).toBeNull();
  });

  it("невідомий курс → 404", async () => {
    m.getCourseState.mockResolvedValue(null);
    expect((await call()).status).toBe(404);
  });
});

describe("signInWithProvider", () => {
  const profile = { sub: "s1", email: "new@x.com", emailVerified: true, name: "Нова" };

  it("нова людина → квиток реєстрації, акаунт не створюється", async () => {
    m.userFindUnique.mockResolvedValue(null);
    const res = await signInWithProvider("google", profile);
    expect(res.type).toBe("signup");
    expect(m.userUpdate).not.toHaveBeenCalled();
  });

  it("наявний акаунт за підтвердженою поштою → прив'язує sub і видає токени", async () => {
    m.userFindUnique.mockImplementation(async ({ where }: { where: Record<string, string> }) =>
      where.email ? user("parent", { googleSub: null }) : null,
    );
    m.userFindUniqueOrThrow.mockResolvedValue(user("parent"));
    const res = await signInWithProvider("google", profile);
    expect(res.type).toBe("tokens");
    expect(m.userUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ googleSub: "s1" }) }));
  });

  it("непідтверджена пошта не прив'язується до чужого акаунта", async () => {
    m.userFindUnique.mockResolvedValue(null);
    const res = await signInWithProvider("google", { ...profile, emailVerified: false });
    expect(res).toEqual({ type: "reject", reason: "unverified" });
  });

  it("Apple без пошти → реєстрація за sub", async () => {
    m.userFindUnique.mockResolvedValue(null);
    const res = await signInWithProvider("apple", { sub: "a1", email: "", emailVerified: false, name: "" });
    expect(res.type).toBe("signup");
  });

  it("викладач через Google → відмова за роллю", async () => {
    m.userFindUnique.mockResolvedValue(user("teacher"));
    m.userFindUniqueOrThrow.mockResolvedValue(user("teacher"));
    expect(await signInWithProvider("google", profile)).toEqual({ type: "reject", reason: "role" });
  });
});
