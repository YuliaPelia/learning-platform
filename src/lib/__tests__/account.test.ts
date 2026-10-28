import { beforeEach, describe, expect, it, vi } from "vitest";

const { paymentUpdateMany, subUpdateMany, subFindMany, subUpdate, userDelete, userDeleteMany, userUpdate, tokenDeleteMany, transaction, getWfpConfig, removeRegularPayment } = vi.hoisted(() => ({
  paymentUpdateMany: vi.fn(),
  subUpdateMany: vi.fn(),
  subFindMany: vi.fn(),
  subUpdate: vi.fn(),
  userDelete: vi.fn(),
  userDeleteMany: vi.fn(),
  userUpdate: vi.fn(),
  tokenDeleteMany: vi.fn(),
  transaction: vi.fn(),
  getWfpConfig: vi.fn(),
  removeRegularPayment: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({
  prisma: {
    subscription: { findMany: subFindMany, update: subUpdate, updateMany: subUpdateMany },
    payment: { updateMany: paymentUpdateMany },
    user: { delete: userDelete, deleteMany: userDeleteMany, update: userUpdate },
    refreshToken: { deleteMany: tokenDeleteMany },
    $transaction: transaction,
  },
}));
vi.mock("@/lib/wayforpay", () => ({ getWfpConfig, removeRegularPayment }));

import { deleteAccount, deleteStudentProfile } from "@/lib/account";

const live = { id: "s1", orderReference: "ORD-1", status: "active" };
const pending = { id: "s2", orderReference: "ORD-2", status: "pending" };

describe("видалення акаунта", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subFindMany.mockResolvedValue([]);
    getWfpConfig.mockReturnValue({ merchant: "m" });
    removeRegularPayment.mockResolvedValue(true);
  });

  it("учень, створений батьками, не видаляє себе сам", async () => {
    const r = await deleteAccount({ id: "u1", role: "student", parentId: "p1" });
    expect(r.ok).toBe(false);
    expect(userDelete).not.toHaveBeenCalled();
  });

  it("учень, що зареєструвався сам, видаляється повністю", async () => {
    expect(await deleteAccount({ id: "u1", role: "student", parentId: null })).toEqual({ ok: true });
    expect(userDelete).toHaveBeenCalledWith({ where: { id: "u1" } });
  });

  it("викладач чи адмін не видаляються самообслуговуванням", async () => {
    expect((await deleteAccount({ id: "t1", role: "teacher", parentId: null })).ok).toBe(false);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("батьки: списання скасовано, діти видалені, акаунт знеособлено", async () => {
    subFindMany.mockResolvedValue([live]);
    expect(await deleteAccount({ id: "p1", role: "parent", parentId: null })).toEqual({ ok: true });
    expect(removeRegularPayment).toHaveBeenCalledWith({ merchant: "m" }, "ORD-1");
    expect(subUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "s1" }, data: expect.objectContaining({ status: "canceled" }) }));
    expect(userDeleteMany).toHaveBeenCalledWith({ where: { parentId: "p1" } });
    expect(tokenDeleteMany).toHaveBeenCalledWith({ where: { userId: "p1" } });
    const data = userUpdate.mock.calls[0][0].data;
    expect(data).toMatchObject({ email: null, passwordHash: null, googleSub: null, appleSub: null, birthYear: null, login: "deleted-p1" });
    expect(data.deletedAt).toBeInstanceOf(Date);
    expect(paymentUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { subscription: { userId: "p1" } } }));
    expect(subUpdateMany).toHaveBeenCalledWith({ where: { userId: "p1" }, data: { recToken: null } });
  });

  it("незавершена оплата скасовується без звернення до WayForPay", async () => {
    subFindMany.mockResolvedValue([pending]);
    expect(await deleteAccount({ id: "p1", role: "parent", parentId: null })).toEqual({ ok: true });
    expect(subFindMany.mock.calls[0][0].where.status).toEqual({ in: ["active", "past_due", "pending"] });
    expect(removeRegularPayment).not.toHaveBeenCalled();
    expect(subUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "s2" } }));
  });

  it("якщо WayForPay не зупинив списання — нічого не видаляємо", async () => {
    subFindMany.mockResolvedValue([live]);
    removeRegularPayment.mockResolvedValue(false);
    expect((await deleteAccount({ id: "p1", role: "parent", parentId: null })).ok).toBe(false);
    expect((await deleteStudentProfile("c1")).ok).toBe(false);
    expect(transaction).not.toHaveBeenCalled();
    expect(userDelete).not.toHaveBeenCalled();
  });
});
