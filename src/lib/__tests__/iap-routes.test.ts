import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireMobileUser: vi.fn(),
  userFindFirst: vi.fn(),
  planFindUnique: vi.fn(),
  subFindUnique: vi.fn(),
  subFindFirst: vi.fn(),
  subCreate: vi.fn(),
  subUpdate: vi.fn(),
  courseFindUnique: vi.fn(),
  verifyApple: vi.fn(),
  verifyGoogle: vi.fn(),
  decodeAppleNotification: vi.fn(),
  rtdnToken: { value: "secret" as string | undefined },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({
  prisma: {
    user: { findFirst: m.userFindFirst },
    plan: { findUnique: m.planFindUnique },
    subscription: { findUnique: m.subFindUnique, findFirst: m.subFindFirst, create: m.subCreate, update: m.subUpdate },
    course: { findUnique: m.courseFindUnique },
  },
}));
vi.mock("@/lib/mobile/http", async (orig) => ({ ...(await orig<typeof import("@/lib/mobile/http")>()), requireMobileUser: m.requireMobileUser }));
vi.mock("@/lib/iap/apple", () => ({ verifyApple: m.verifyApple, decodeAppleNotification: m.decodeAppleNotification }));
vi.mock("@/lib/iap/google", () => ({ verifyGoogle: m.verifyGoogle }));
vi.mock("@/lib/iap/config", () => ({ iapConfig: () => ({ googleRtdnToken: m.rtdnToken.value, allowSandbox: true }) }));

import { POST as verify } from "@/app/api/mobile/v1/billing/iap/verify/route";
import { POST as appleHook } from "@/app/api/mobile/v1/billing/iap/apple-notifications/route";
import { POST as googleHook } from "@/app/api/mobile/v1/billing/iap/google-notifications/route";
import { POST as chooseCourse } from "@/app/api/mobile/v1/subscriptions/[id]/course/route";
import { IapNotConfigured, IapRejected } from "@/lib/iap/types";

const CHILD = "11111111-1111-4111-8111-111111111111";
const SUB = "22222222-2222-4222-8222-222222222222";
const COURSE = "33333333-3333-4333-8333-333333333333";
const PRODUCT = "tech.itcodecraft.slot1.standard.monthly";
const future = new Date(Date.now() + 30 * 86_400_000);
const req = (body: unknown, url = "http://x/api") => new Request(url, { method: "POST", body: JSON.stringify(body) });
const goodBody = { childId: CHILD, productId: PRODUCT, platform: "apple", token: "jws" };
const verified = { provider: "apple", externalId: "orig-1", productId: PRODUCT, expiresAt: future, state: "active", sandbox: false };

beforeEach(() => {
  vi.clearAllMocks();
  m.rtdnToken.value = "secret";
  m.requireMobileUser.mockResolvedValue({ user: { id: "p1", role: "parent" }, response: null });
  m.userFindFirst.mockResolvedValue({ id: CHILD });
  m.planFindUnique.mockResolvedValue({ id: "plan1", code: "standard", price: 44900, isActive: true });
  m.subFindUnique.mockResolvedValue(null);
  m.subCreate.mockResolvedValue({ id: SUB, slot: 1, status: "active", endsAt: future, courseId: null });
  m.verifyApple.mockResolvedValue(verified);
});

describe("POST /billing/iap/verify", () => {
  it("без входу → відповідь авторизації", async () => {
    m.requireMobileUser.mockResolvedValue({ user: null, response: new Response(null, { status: 401 }) });
    expect((await verify(req(goodBody))).status).toBe(401);
  });
  it("дитина не може купувати", async () => {
    m.requireMobileUser.mockResolvedValue({ user: { id: "s1", role: "student" }, response: null });
    expect((await verify(req(goodBody))).status).toBe(403);
    expect(m.verifyApple).not.toHaveBeenCalled();
  });
  it("некоректне тіло й невідомий товар → 400 до будь-яких запитів у магазин", async () => {
    expect((await verify(req({ childId: "x" }))).status).toBe(400);
    expect((await verify(req({ ...goodBody, productId: "com.other" }))).status).toBe(400);
    expect(m.verifyApple).not.toHaveBeenCalled();
  });
  it("чужа дитина → 404, магазин не опитується", async () => {
    m.userFindFirst.mockResolvedValue(null);
    expect((await verify(req(goodBody))).status).toBe(404);
    expect(m.userFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ parentId: "p1" }) }));
    expect(m.verifyApple).not.toHaveBeenCalled();
  });
  it("успіх: створює підписку для дитини; для тарифу «1 курс» просить обрати курс", async () => {
    const res = await verify(req(goodBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.subscription).toMatchObject({ id: SUB, plan: "standard", slot: 1, needsCourse: true });
    expect(m.subCreate.mock.calls[0][0].data).toMatchObject({ userId: "p1", studentId: CHILD, provider: "apple", externalId: "orig-1", slot: 1, status: "active", amount: 44900 });
  });
  it("Google: передає purchaseToken і очікуваний товар", async () => {
    m.verifyGoogle.mockResolvedValue({ ...verified, provider: "google", externalId: "tok" });
    await verify(req({ ...goodBody, platform: "google", token: "tok" }));
    expect(m.verifyGoogle).toHaveBeenCalledWith("tok", PRODUCT);
  });
  it("квитанція на інший товар → 400", async () => {
    m.verifyApple.mockResolvedValue({ ...verified, productId: "tech.itcodecraft.slot1.basic.monthly" });
    expect((await verify(req(goodBody))).status).toBe(400);
    expect(m.subCreate).not.toHaveBeenCalled();
  });
  it("повторна та сама покупка оновлює, а не дублює", async () => {
    m.subFindUnique.mockResolvedValue({ id: SUB, userId: "p1" });
    m.subUpdate.mockResolvedValue({ id: SUB, slot: 1, status: "active", endsAt: future, courseId: COURSE });
    const json = await (await verify(req(goodBody))).json();
    expect(m.subCreate).not.toHaveBeenCalled();
    expect(json.subscription.needsCourse).toBe(false);
  });
  it("покупка, привʼязана до іншого батька → 400", async () => {
    m.subFindUnique.mockResolvedValue({ id: SUB, userId: "other" });
    expect((await verify(req(goodBody))).status).toBe(400);
    expect(m.subUpdate).not.toHaveBeenCalled();
  });
  it("прострочена або відкликана підписка → 400", async () => {
    m.verifyApple.mockResolvedValue({ ...verified, state: "expired" });
    expect((await verify(req(goodBody))).status).toBe(400);
  });
  it("підроблена квитанція → 400, магазини не налаштовані → 503", async () => {
    m.verifyApple.mockRejectedValue(new IapRejected("Підпис транзакції недійсний"));
    expect((await verify(req(goodBody))).status).toBe(400);
    m.verifyApple.mockRejectedValue(new IapNotConfigured("нема ключів"));
    expect((await verify(req(goodBody))).status).toBe(503);
  });
});

describe("сповіщення магазинів", () => {
  it("Apple: оновлює підписку за originalTransactionId", async () => {
    m.decodeAppleNotification.mockResolvedValue({ type: "DID_RENEW", subtype: undefined, tx: { originalTransactionId: "orig-1", expiresDate: future.getTime() } });
    m.subFindUnique.mockResolvedValue({ id: SUB, canceledAt: null });
    expect((await appleHook(req({ signedPayload: "jws" }))).status).toBe(200);
    expect(m.subUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: SUB }, data: expect.objectContaining({ status: "active", endsAt: future }) }));
  });
  it("Apple: недійсний підпис → 400, без підпису → 400", async () => {
    m.decodeAppleNotification.mockRejectedValue(new IapRejected("x"));
    expect((await appleHook(req({ signedPayload: "bad" }))).status).toBe(400);
    expect((await appleHook(req({}))).status).toBe(400);
    expect(m.subUpdate).not.toHaveBeenCalled();
  });
  const rtdn = (token: string | null) => req({ message: { data: Buffer.from(JSON.stringify({ subscriptionNotification: { purchaseToken: "tok" } })).toString("base64") } }, `http://x/api${token === null ? "" : `?token=${token}`}`);
  it("Google: без секрету або з чужим → 401; секрет не налаштовано → 503", async () => {
    expect((await googleHook(rtdn(null))).status).toBe(401);
    expect((await googleHook(rtdn("wrong"))).status).toBe(401);
    m.rtdnToken.value = undefined;
    expect((await googleHook(rtdn("secret"))).status).toBe(503);
    expect(m.verifyGoogle).not.toHaveBeenCalled();
  });
  it("Google: перепитує стан у Google й оновлює підписку", async () => {
    m.verifyGoogle.mockResolvedValue({ ...verified, provider: "google", externalId: "tok", state: "canceled" });
    m.subFindUnique.mockResolvedValue({ id: SUB, canceledAt: null });
    expect((await googleHook(rtdn("secret"))).status).toBe(200);
    expect(m.verifyGoogle).toHaveBeenCalledWith("tok");
    expect(m.subUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "canceled" }) }));
  });
});

describe("POST /subscriptions/[id]/course", () => {
  const call = (body: unknown, id = SUB) => chooseCourse(req(body), { params: Promise.resolve({ id }) } as never);
  beforeEach(() => {
    m.subFindFirst.mockResolvedValue({ id: SUB, courseId: null, plan: { code: "standard" } });
    m.courseFindUnique.mockResolvedValue({ id: COURSE, status: "published", minPlan: { code: "basic" } });
  });
  it("обирає курс один раз", async () => {
    expect((await call({ courseSlug: "html-css-js" })).status).toBe(200);
    expect(m.courseFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { slug: "html-css-js" } }));
    expect(m.subUpdate).toHaveBeenCalledWith({ where: { id: SUB }, data: { courseId: COURSE } });
  });
  it("чужа підписка → 404; Преміум і вже обраний курс → 409", async () => {
    m.subFindFirst.mockResolvedValue(null);
    expect((await call({ courseSlug: "html-css-js" })).status).toBe(404);
    m.subFindFirst.mockResolvedValue({ id: SUB, courseId: null, plan: { code: "premium" } });
    expect((await call({ courseSlug: "html-css-js" })).status).toBe(409);
    m.subFindFirst.mockResolvedValue({ id: SUB, courseId: COURSE, plan: { code: "basic" } });
    expect((await call({ courseSlug: "html-css-js" })).status).toBe(409);
  });
  it("непублікований курс або курс лише для Преміуму → 400", async () => {
    m.courseFindUnique.mockResolvedValue({ id: COURSE, status: "soon", minPlan: { code: "basic" } });
    expect((await call({ courseSlug: "html-css-js" })).status).toBe(400);
    m.courseFindUnique.mockResolvedValue({ id: COURSE, status: "published", minPlan: { code: "premium" } });
    expect((await call({ courseSlug: "html-css-js" })).status).toBe(400);
  });
});
