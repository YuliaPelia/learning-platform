import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUser, userCreate, findUnique, userFindFirst, subFindMany, subUpdate, userDelete, getWfpConfig, removeRegularPayment } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  userCreate: vi.fn(),
  findUnique: vi.fn(),
  userFindFirst: vi.fn(),
  subFindMany: vi.fn(),
  subUpdate: vi.fn(),
  userDelete: vi.fn(),
  getWfpConfig: vi.fn(),
  removeRegularPayment: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({
  prisma: {
    user: { findUnique, findFirst: userFindFirst, create: userCreate, delete: userDelete },
    subscription: { findMany: subFindMany, update: subUpdate },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/wayforpay", () => ({ getWfpConfig, removeRegularPayment }));
vi.mock("@/lib/dal", () => ({ requireUser }));
vi.mock("@/lib/request", () => ({ requestMeta: async () => ({ ip: "x", userAgent: null }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma } from "@/db";
import { addChild, deleteChild } from "@/actions/children";

const CID = "11111111-1111-4111-8111-111111111111";

const form = (f: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(f)) fd.set(k, v);
  return fd;
};

describe("children actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ id: "p1" });
  });

  it("addChild і deleteChild вимагають роль parent", async () => {
    await addChild(undefined, form({}));
    await deleteChild(undefined, form({ childId: CID }));
    expect(requireUser).toHaveBeenNthCalledWith(1, "parent");
    expect(requireUser).toHaveBeenNthCalledWith(2, "parent");
  });

  it("addChild: невалідні дані відхиляються zod до звернення до БД", async () => {
    const r = await addChild(undefined, form({ name: "К", birthYear: "1900", login: "A B", password: "1" }));
    expect(r?.error).toBeTruthy();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("addChild: порожній email не записується", async () => {
    findUnique.mockResolvedValue(null);
    const txCreate = vi.fn().mockResolvedValue({ id: "c1" });
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) =>
      (fn as (tx: unknown) => Promise<unknown>)({ user: { create: txCreate }, consent: { create: vi.fn() } }),
    );
    const r = await addChild(undefined, form({ name: "Макс", birthYear: "2014", login: "maks", password: "maks12345", childDataConsent: "on", email: "" }));
    expect(r?.ok).toBe(true);
    expect(r?.values?.email).toBeUndefined();
    expect(txCreate.mock.calls[0][0].data.email).toBeNull();
    expect(userFindFirst).not.toHaveBeenCalled();
  });

  it("addChild: зайнятий email не створює профіль", async () => {
    findUnique.mockResolvedValue(null);
    userFindFirst.mockResolvedValue({ id: "other" });
    const r = await addChild(undefined, form({ name: "Макс", birthYear: "2014", login: "maks", password: "maks12345", childDataConsent: "on", email: "kid@gmail.com" }));
    expect(r?.error).toBe("Акаунт з таким email уже існує");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("addChild: вільний email зберігається в нижньому регістрі", async () => {
    findUnique.mockResolvedValue(null);
    userFindFirst.mockResolvedValue(null);
    const txCreate = vi.fn().mockResolvedValue({ id: "c1" });
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) =>
      (fn as (tx: unknown) => Promise<unknown>)({ user: { create: txCreate }, consent: { create: vi.fn() } }),
    );
    const r = await addChild(undefined, form({ name: "Макс", birthYear: "2014", login: "maks", password: "maks12345", childDataConsent: "on", email: "Kid@gmail.com" }));
    expect(r).toMatchObject({ ok: true, values: { email: "kid@gmail.com" } });
    expect(txCreate.mock.calls[0][0].data.email).toBe("kid@gmail.com");
  });

  it("deleteChild: не-UUID childId відхиляється без звернення до БД", async () => {
    const r = await deleteChild(undefined, form({ childId: "not-a-uuid" }));
    expect(r).toEqual({});
    expect(userFindFirst).not.toHaveBeenCalled();
    expect(userDelete).not.toHaveBeenCalled();
  });

  describe("deleteChild і WayForPay", () => {
    beforeEach(() => {
      userFindFirst.mockResolvedValue({ id: "c1" });
      subFindMany.mockResolvedValue([{ id: "s1", orderReference: "ITC-1" }]);
      getWfpConfig.mockReturnValue({ merchantAccount: "m" });
    });

    it("якщо REMOVE не вдався — нічого не скасовує й не видаляє, повертає помилку", async () => {
      removeRegularPayment.mockResolvedValue(false);
      const err = vi.spyOn(console, "error").mockImplementation(() => {});
      const r = await deleteChild(undefined, form({ childId: CID }));
      expect(r?.error).toBeTruthy();
      expect(subUpdate).not.toHaveBeenCalled();
      expect(userDelete).not.toHaveBeenCalled();
      err.mockRestore();
    });

    it("якщо REMOVE вдався — скасовує підписку й видаляє дитину", async () => {
      removeRegularPayment.mockResolvedValue(true);
      const r = await deleteChild(undefined, form({ childId: CID }));
      expect(r?.ok).toBe(true);
      expect(subUpdate.mock.calls[0][0].data.status).toBe("canceled");
      expect(userDelete).toHaveBeenCalled();
    });
  });
});
