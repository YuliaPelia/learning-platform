import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  subFindUnique: vi.fn(),
  subUpdate: vi.fn(),
  payFindUnique: vi.fn(),
  payCreate: vi.fn(),
  payUpdateMany: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => {
  const tx = {
    payment: { findUnique: m.payFindUnique, create: m.payCreate, updateMany: m.payUpdateMany },
    subscription: { update: m.subUpdate },
  };
  return {
    prisma: {
      subscription: { findUnique: m.subFindUnique },
      $transaction: (fn: (t: typeof tx) => unknown) => fn(tx),
    },
  };
});
vi.mock("../mailer", () => ({ sendEmail: m.sendEmail, appUrl: (p = "") => p }));

import { applyPaymentEvent, baseOrderReference } from "../billing";
import type { WfpCallback } from "../wayforpay";

const sub = (over = {}) => ({
  id: "s1",
  orderReference: "ITC-1",
  amount: 44900,
  status: "pending",
  startsAt: null,
  endsAt: null,
  recToken: null,
  plan: { name: "Базовий" },
  user: { email: "p@x.ua" },
  ...over,
});
const cb = (over: Partial<WfpCallback> = {}): WfpCallback => ({
  merchantAccount: "m",
  merchantSignature: "s",
  orderReference: "ITC-1",
  amount: 449,
  currency: "UAH",
  transactionStatus: "Approved",
  ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
  m.subFindUnique.mockResolvedValue(sub());
  m.payFindUnique.mockResolvedValue(null);
  m.payCreate.mockResolvedValue({});
  m.subUpdate.mockResolvedValue({});
  m.sendEmail.mockResolvedValue(true);
});

describe("applyPaymentEvent", () => {
  it("перший успішний платіж активує підписку й шле лист", async () => {
    expect(await applyPaymentEvent(cb({ recToken: "tok" }))).toBe("ok");
    expect(m.subUpdate.mock.calls[0][0].data).toMatchObject({ status: "active", recToken: "tok" });
    expect(m.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("повторний callback з тим самим статусом нічого не змінює", async () => {
    m.payFindUnique.mockResolvedValue({ id: "p1", status: "approved" });
    expect(await applyPaymentEvent(cb())).toBe("duplicate");
    expect(m.subUpdate).not.toHaveBeenCalled();
    expect(m.payCreate).not.toHaveBeenCalled();
    expect(m.sendEmail).not.toHaveBeenCalled();
  });

  it("паралельний дубль (P2002 на orderId) не продовжує доступ", async () => {
    const { Prisma } = await import("@/generated/prisma/client");
    m.payCreate.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "x" }));
    expect(await applyPaymentEvent(cb())).toBe("duplicate");
    expect(m.subUpdate).not.toHaveBeenCalled();
  });

  it("неправильна сума відхиляється до будь-яких змін у БД", async () => {
    expect(await applyPaymentEvent(cb({ amount: 1 }))).toBe("amount_mismatch");
    expect(m.payCreate).not.toHaveBeenCalled();
    expect(m.subUpdate).not.toHaveBeenCalled();
  });

  it("неправильна валюта відхиляється", async () => {
    expect(await applyPaymentEvent(cb({ currency: "USD" }))).toBe("amount_mismatch");
    expect(m.payCreate).not.toHaveBeenCalled();
  });

  it("невідоме замовлення", async () => {
    m.subFindUnique.mockResolvedValue(null);
    expect(await applyPaymentEvent(cb())).toBe("unknown_order");
  });

  it("регулярний платіж _WFPREG-N продовжує доступ рівно на місяць", async () => {
    const end = new Date(Date.now() + 5 * 86400000);
    m.subFindUnique.mockResolvedValue(sub({ status: "active", startsAt: new Date(), endsAt: end }));
    expect(baseOrderReference("ITC-1_WFPREG-3")).toBe("ITC-1");
    expect(await applyPaymentEvent(cb({ orderReference: "ITC-1_WFPREG-3" }))).toBe("ok");
    expect(m.subFindUnique.mock.calls[0][0].where.orderReference).toBe("ITC-1");
    expect(m.payCreate.mock.calls[0][0].data.orderId).toBe("ITC-1_WFPREG-3");
    const newEnd: Date = m.subUpdate.mock.calls[0][0].data.endsAt;
    const expected = new Date(end);
    expected.setMonth(expected.getMonth() + 1);
    if (expected.getDate() !== end.getDate()) expected.setDate(0);
    expect(newEnd.getTime()).toBe(expected.getTime());
  });

  it("помилка листа не ламає обробку", async () => {
    m.sendEmail.mockRejectedValue(new Error("boom"));
    expect(await applyPaymentEvent(cb())).toBe("ok");
  });

  it("запізнілий Declined не знижує підтверджений платіж", async () => {
    m.payFindUnique.mockResolvedValue({ id: "p1", status: "approved" });
    expect(await applyPaymentEvent(cb({ transactionStatus: "Declined" }))).toBe("duplicate");
    expect(m.subUpdate).not.toHaveBeenCalled();
  });

  it("Declined активної підписки переводить її в past_due", async () => {
    m.subFindUnique.mockResolvedValue(sub({ status: "active" }));
    expect(await applyPaymentEvent(cb({ transactionStatus: "Declined" }))).toBe("ok");
    expect(m.subUpdate.mock.calls[0][0].data).toEqual({ status: "past_due" });
  });
});
