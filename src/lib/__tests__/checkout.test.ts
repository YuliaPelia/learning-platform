import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  findFirst: vi.fn(),
  update: vi.fn(),
  requireUser: vi.fn(),
  getWfpConfig: vi.fn(),
  removeRegularPayment: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ prisma: { subscription: { findFirst: m.findFirst, update: m.update } } }));
vi.mock("@/lib/dal", () => ({ requireUser: m.requireUser }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/request", () => ({ requestMeta: vi.fn() }));
vi.mock("@/lib/wayforpay", () => ({ getWfpConfig: m.getWfpConfig, removeRegularPayment: m.removeRegularPayment }));

import { cancelSubscription } from "@/actions/checkout";

const ID = "123e4567-e89b-42d3-a456-426614174000";
const form = (id: string) => {
  const fd = new FormData();
  fd.set("subscriptionId", id);
  return fd;
};

describe("cancelSubscription", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    m.requireUser.mockResolvedValue({ id: "parent1" });
    m.findFirst.mockResolvedValue({ id: ID, status: "active", orderReference: "ITC-1" });
    m.getWfpConfig.mockReturnValue({ merchantAccount: "m" });
    m.removeRegularPayment.mockResolvedValue(true);
  });

  it("шукає підписку лише серед підписок цього батька", async () => {
    await cancelSubscription(undefined, form(ID));
    expect(m.findFirst.mock.calls[0][0].where).toEqual({ id: ID, userId: "parent1" });
  });

  it("викликає REMOVE і ставить canceled", async () => {
    await cancelSubscription(undefined, form(ID));
    expect(m.removeRegularPayment).toHaveBeenCalledWith({ merchantAccount: "m" }, "ITC-1");
    expect(m.update.mock.calls[0][0].data.status).toBe("canceled");
  });

  it("якщо REMOVE не вдався — статус не змінюється", async () => {
    m.removeRegularPayment.mockResolvedValue(false);
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await cancelSubscription(undefined, form(ID));
    expect(m.update).not.toHaveBeenCalled();
    expect(r?.error).toBeTruthy();
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it("невалідний id ігнорується", async () => {
    await cancelSubscription(undefined, form("abc"));
    expect(m.findFirst).not.toHaveBeenCalled();
  });

  it("чужа або вже скасована підписка не чіпається", async () => {
    m.findFirst.mockResolvedValue(null);
    await cancelSubscription(undefined, form(ID));
    expect(m.update).not.toHaveBeenCalled();
  });
});
