import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUser: vi.fn(),
  userFindFirst: vi.fn(),
  userUpdate: vi.fn(),
  tokenUpdateMany: vi.fn(),
  resetFailures: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({
  prisma: {
    user: { findFirst: m.userFindFirst, update: m.userUpdate },
    refreshToken: { updateMany: m.tokenUpdateMany },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/dal", () => ({ requireUser: m.requireUser }));
vi.mock("@/lib/password", () => ({ hashPassword: async (p: string) => `hash(${p})` }));
vi.mock("@/lib/rate-limit", () => ({ loginKey: (l: string) => `login:${l}`, resetFailures: m.resetFailures }));
vi.mock("@/lib/request", () => ({ requestMeta: async () => ({}) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { changeChildPassword } from "@/actions/children";

const CID = "11111111-1111-4111-8111-111111111111";
const form = (f: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(f)) fd.set(k, v);
  return fd;
};

describe("зміна пароля дитини батьками", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.requireUser.mockResolvedValue({ id: "p1" });
  });

  it("вимагає роль parent і шукає лише серед своїх дітей", async () => {
    m.userFindFirst.mockResolvedValue(null);
    const r = await changeChildPassword(undefined, form({ childId: CID, password: "newpass123" }));
    expect(m.requireUser).toHaveBeenCalledWith("parent");
    expect(m.userFindFirst.mock.calls[0][0].where).toEqual({ id: CID, parentId: "p1", deletedAt: null });
    expect(r?.error).toBeTruthy();
    expect(m.userUpdate).not.toHaveBeenCalled();
  });

  it("слабкий пароль відхиляється без звернення до бази", async () => {
    const r = await changeChildPassword(undefined, form({ childId: CID, password: "short" }));
    expect(r?.error).toBeTruthy();
    expect(m.userFindFirst).not.toHaveBeenCalled();
  });

  it("свою дитину: новий хеш, вихід з застосунку, блокування входу знято", async () => {
    m.userFindFirst.mockResolvedValue({ id: CID, login: "ira1" });
    expect(await changeChildPassword(undefined, form({ childId: CID, password: "newpass123" }))).toEqual({ ok: true });
    expect(m.userUpdate).toHaveBeenCalledWith({ where: { id: CID }, data: { passwordHash: "hash(newpass123)" } });
    expect(m.tokenUpdateMany.mock.calls[0][0].where).toEqual({ userId: CID, revokedAt: null });
    expect(m.resetFailures).toHaveBeenCalledWith("login:ira1");
  });
});
