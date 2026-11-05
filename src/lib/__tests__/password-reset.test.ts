import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  codeFind: vi.fn(),
  codeUpsert: vi.fn(),
  codeUpdate: vi.fn(),
  codeDelete: vi.fn(),
  userFindFirst: vi.fn(),
  userUpdate: vi.fn(),
  tokenUpdateMany: vi.fn(),
  transaction: vi.fn(),
  sendEmail: vi.fn(),
  resetFailures: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({
  prisma: {
    emailCode: { findUnique: m.codeFind, upsert: m.codeUpsert, update: m.codeUpdate, delete: m.codeDelete },
    user: { findFirst: m.userFindFirst, update: m.userUpdate },
    refreshToken: { updateMany: m.tokenUpdateMany },
    $transaction: m.transaction,
  },
}));
vi.mock("@/lib/mailer", () => ({ sendEmail: m.sendEmail }));
vi.mock("@/lib/rate-limit", () => ({ loginKey: (l: string) => `login:${l}`, resetFailures: m.resetFailures }));
vi.mock("@/lib/password", () => ({ hashPassword: async (p: string) => `hash(${p})` }));

import { hashEmailCode } from "@/lib/email-code";
import { requestPasswordReset, resetCodeKey, resetPassword } from "@/lib/password-reset";

const SECRET = "test-secret-test-secret-test-secret-123";
const now = new Date("2026-11-05T12:00:00Z");
const user = { id: "u1", login: "mama@example.com" };
const row = (over = {}) => ({
  email: resetCodeKey("mama@example.com"),
  codeHash: hashEmailCode("123456", SECRET),
  expiresAt: new Date(now.getTime() + 60_000),
  sentAt: new Date(now.getTime() - 120_000),
  attempts: 0,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env.MOBILE_JWT_SECRET = SECRET;
  m.sendEmail.mockResolvedValue(true);
  m.userFindFirst.mockResolvedValue(user);
  m.codeFind.mockResolvedValue(null);
});

describe("надсилання коду", () => {
  it("надсилає лист і зберігає лише хеш коду з ключем reset:", async () => {
    expect(await requestPasswordReset("mama@example.com", now)).toEqual({ ok: true });
    const [to, , text] = m.sendEmail.mock.calls[0];
    expect(to).toBe("mama@example.com");
    const code = /(\d{6})/.exec(text)![1];
    const saved = m.codeUpsert.mock.calls[0][0];
    expect(saved.where.email).toBe("reset:mama@example.com");
    expect(saved.create.codeHash).toBe(hashEmailCode(code, SECRET));
    expect(JSON.stringify(saved)).not.toContain(code);
  });

  it("невідома пошта — так само «ok», але лист не надсилається", async () => {
    m.userFindFirst.mockResolvedValue(null);
    expect(await requestPasswordReset("nobody@example.com", now)).toEqual({ ok: true });
    expect(m.sendEmail).not.toHaveBeenCalled();
    expect(m.codeUpsert).not.toHaveBeenCalled();
  });

  it("повторний лист — не частіше ніж раз на хвилину", async () => {
    m.codeFind.mockResolvedValue(row({ sentAt: new Date(now.getTime() - 10_000) }));
    const r = await requestPasswordReset("mama@example.com", now);
    expect(r.ok).toBe(false);
    expect(m.sendEmail).not.toHaveBeenCalled();
  });
});

describe("зміна пароля", () => {
  it("вірний код: новий пароль, код видалено, мобільні сесії відкликано, блокування знято", async () => {
    m.codeFind.mockResolvedValue(row());
    expect(await resetPassword("mama@example.com", "123456", "newpass123", now)).toEqual({ ok: true, userId: "u1" });
    expect(m.codeDelete).toHaveBeenCalledWith({ where: { email: "reset:mama@example.com" } });
    expect(m.userUpdate).toHaveBeenCalledWith({ where: { id: "u1" }, data: { passwordHash: "hash(newpass123)" } });
    expect(m.tokenUpdateMany).toHaveBeenCalledWith({ where: { userId: "u1", revokedAt: null }, data: { revokedAt: now } });
    expect(m.resetFailures).toHaveBeenCalledWith("login:mama@example.com");
  });

  it("невірний код рахує спробу й пароль не змінює", async () => {
    m.codeFind.mockResolvedValue(row());
    expect((await resetPassword("mama@example.com", "000000", "newpass123", now)).ok).toBe(false);
    expect(m.codeUpdate).toHaveBeenCalledWith({ where: { email: "reset:mama@example.com" }, data: { attempts: { increment: 1 } } });
    expect(m.userUpdate).not.toHaveBeenCalled();
  });

  it("прострочений код, вичерпані спроби або немає коду — відмова", async () => {
    m.codeFind.mockResolvedValue(row({ expiresAt: new Date(now.getTime() - 1) }));
    expect((await resetPassword("mama@example.com", "123456", "newpass123", now)).ok).toBe(false);
    m.codeFind.mockResolvedValue(row({ attempts: 5 }));
    expect((await resetPassword("mama@example.com", "123456", "newpass123", now)).ok).toBe(false);
    m.codeFind.mockResolvedValue(null);
    expect((await resetPassword("mama@example.com", "123456", "newpass123", now)).ok).toBe(false);
    expect(m.userUpdate).not.toHaveBeenCalled();
  });
});
