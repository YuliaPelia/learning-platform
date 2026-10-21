import { beforeEach, describe, expect, it, vi } from "vitest";

const { exchangeCode, verifyIdToken, userFindUnique, userUpdate, createSession, cookieSet, cookieDelete, cookieGet } = vi.hoisted(() => ({
  exchangeCode: vi.fn(),
  verifyIdToken: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  createSession: vi.fn(),
  cookieSet: vi.fn(),
  cookieDelete: vi.fn(),
  cookieGet: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookieGet, set: cookieSet, delete: cookieDelete }),
}));
vi.mock("@/db", () => ({ prisma: { user: { findUnique: userFindUnique, update: userUpdate } } }));
vi.mock("@/lib/session", () => ({ createSession }));
vi.mock("@/lib/google-oauth", () => ({
  exchangeCode,
  verifyIdToken,
  appBase: () => "http://localhost:3000",
  googleRedirectUri: () => "http://localhost:3000/api/auth/google/callback",
}));

import { GET } from "@/app/api/auth/google/callback/route";

const profile = { sub: "sub-1", email: "parent@gmail.com", emailVerified: true, name: "Олена" };

function call(query: string) {
  return GET(new Request(`http://localhost:3000/api/auth/google/callback?${query}`));
}

describe("google callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SESSION_SECRET = "s".repeat(40);
    cookieGet.mockReturnValue({ value: JSON.stringify({ state: "ok", next: "/pricing" }) });
    exchangeCode.mockResolvedValue("id-token");
    verifyIdToken.mockResolvedValue(profile);
    userFindUnique.mockResolvedValue(null);
  });

  it("наявний користувач отримує сесію і googleSub", async () => {
    userFindUnique.mockImplementation(async ({ where }: { where: { googleSub?: string; email?: string } }) => {
      if (where.email === "parent@gmail.com") {
        return { id: "u1", role: "parent", email: "parent@gmail.com", login: "parent@gmail.com", googleSub: null };
      }
      return null;
    });
    const res = await call("code=c&state=ok");
    expect(res.headers.get("location")).toBe("http://localhost:3000/pricing");
    expect(createSession).toHaveBeenCalledWith("u1", "parent");
    expect(userUpdate).toHaveBeenCalledWith({ where: { id: "u1" }, data: { googleSub: "sub-1" } });
  });

  it("невідома пошта не створює користувача і веде на вибір ролі", async () => {
    const res = await call("code=c&state=ok");
    expect(res.headers.get("location")).toBe("http://localhost:3000/login/google");
    expect(createSession).not.toHaveBeenCalled();
    expect(userUpdate).not.toHaveBeenCalled();
    expect(cookieSet).toHaveBeenCalledWith("google_signup", expect.any(String), expect.objectContaining({ httpOnly: true }));
  });

  it("чужий state не обмінює код", async () => {
    const res = await call("code=c&state=bad");
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?error=google");
    expect(exchangeCode).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });
});
