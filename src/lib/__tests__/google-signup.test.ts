import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookieGet, cookieDelete, userFindFirst, userCreate, createSession, redirect } = vi.hoisted(() => ({
  cookieGet: vi.fn(),
  cookieDelete: vi.fn(),
  userFindFirst: vi.fn(),
  userCreate: vi.fn(),
  createSession: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error("REDIRECT:" + url);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: cookieGet, delete: cookieDelete }) }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/db", () => ({
  prisma: {
    user: { findFirst: userFindFirst, create: userCreate },
    $transaction: async (fn: (tx: { user: { create: typeof userCreate } }) => Promise<unknown>) => fn({ user: { create: userCreate } }),
  },
}));
vi.mock("@/lib/session", () => ({ createSession }));
vi.mock("@/lib/request", () => ({ requestMeta: async () => ({ ip: "1.1.1.1", userAgent: null }) }));

import { signGoogleSignup } from "@/lib/google-auth";
import { completeGoogleParent, completeGoogleStudent } from "@/actions/google-signup";

const form = (f: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(f)) fd.set(k, v);
  return fd;
};

describe("google signup", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.SESSION_SECRET = "s".repeat(40);
    userFindFirst.mockResolvedValue(null);
    userCreate.mockResolvedValue({ id: "new" });
    cookieGet.mockResolvedValue(undefined);
    const token = await signGoogleSignup({ email: "new@gmail.com", name: "Олена", sub: "sub-1", next: null });
    cookieGet.mockReturnValue({ value: token });
  });

  it("без квитка нічого не створює", async () => {
    cookieGet.mockReturnValue(undefined);
    await expect(completeGoogleParent(undefined, form({ name: "Олена", ageConfirm: "on" }))).rejects.toThrow("REDIRECT:/login?error=google");
    expect(userCreate).not.toHaveBeenCalled();
  });

  it("батьки без позначки 18 років не створюються", async () => {
    const r = await completeGoogleParent(undefined, form({ name: "Олена" }));
    expect(r?.error).toMatch(/18/);
    expect(userCreate).not.toHaveBeenCalled();
  });

  it("успішні батьки отримують згоду age_confirm і порожній пароль", async () => {
    await expect(completeGoogleParent(undefined, form({ name: "Олена", ageConfirm: "on" }))).rejects.toThrow("REDIRECT:/cabinet/parent?welcome=1");
    const data = userCreate.mock.calls[0][0].data;
    expect(data).toMatchObject({ role: "parent", email: "new@gmail.com", login: "new@gmail.com", googleSub: "sub-1", passwordHash: null });
    expect(data.consents.create).toMatchObject({ type: "age_confirm" });
    expect(createSession).toHaveBeenCalledWith("new", "parent");
    expect(cookieDelete).toHaveBeenCalledWith("google_signup");
  });

  it("дитина створюється без батьків і зі збереженим роком", async () => {
    await expect(completeGoogleStudent(undefined, form({ name: "Макс", birthYear: "2014" }))).rejects.toThrow("REDIRECT:/cabinet/student");
    expect(userCreate.mock.calls[0][0].data).toMatchObject({
      role: "student",
      email: "new@gmail.com",
      birthYear: 2014,
      passwordHash: null,
    });
    expect(userCreate.mock.calls[0][0].data.parentId).toBeUndefined();
    expect(userCreate.mock.calls[0][0].data.consents).toBeUndefined();
    expect(createSession).toHaveBeenCalledWith("new", "student");
  });
});
