import { describe, expect, it } from "vitest";
import { canAccessLesson, extendPeriod, isSubscriptionLive, type SubscriptionLike } from "../access";
import { formatUah } from "../format";
import { computeBadges, levelFromXp, streakDays } from "../gamification";
import { gradeQuiz, parseLessonContent } from "../lesson-content";
import {
  acceptResponse,
  buildPurchaseFields,
  callbackSignatureString,
  hmacMd5,
  parseCallbackBody,
  purchaseSignatureString,
  verifyCallback,
  wfpDate,
  type WfpCallback,
} from "../wayforpay";

const NOW = new Date("2026-09-28T12:00:00Z");
const inDays = (d: number) => new Date(NOW.getTime() + d * 86400000);
const sub = (over: Partial<SubscriptionLike> = {}): SubscriptionLike => ({
  plan: "standard",
  courseId: "python",
  status: "active",
  currentPeriodEnd: inDays(10),
  ...over,
});

describe("доступ до уроків", () => {
  const base = { courseStatus: "published" as const, courseId: "python", previousLessonCompleted: true, subscriptions: [], now: NOW };

  it("перші 2 уроки безкоштовні", () => {
    expect(canAccessLesson({ ...base, lessonOrder: 1, previousLessonCompleted: false })).toBe("ok");
    expect(canAccessLesson({ ...base, lessonOrder: 2 })).toBe("ok");
    expect(canAccessLesson({ ...base, lessonOrder: 3 })).toBe("needs_subscription");
  });

  it("не можна перескочити урок", () => {
    expect(canAccessLesson({ ...base, lessonOrder: 2, previousLessonCompleted: false })).toBe("locked_sequence");
  });

  it("курс «скоро» закритий", () => {
    expect(canAccessLesson({ ...base, courseStatus: "soon", lessonOrder: 1 })).toBe("coming_soon");
  });

  it("підписка на 1 курс відкриває лише його", () => {
    expect(canAccessLesson({ ...base, lessonOrder: 3, subscriptions: [sub()] })).toBe("ok");
    expect(canAccessLesson({ ...base, courseId: "scratch", lessonOrder: 3, subscriptions: [sub()] })).toBe("needs_subscription");
  });

  it("Преміум відкриває всі курси", () => {
    expect(canAccessLesson({ ...base, courseId: "unity", lessonOrder: 5, subscriptions: [sub({ plan: "premium", courseId: null })] })).toBe("ok");
  });

  it("курс-новинка з мінімальним тарифом Преміум не відкривається нижчим тарифом", () => {
    const premiumOnly = { ...base, minPlan: "premium" as const, lessonOrder: 3 };
    expect(canAccessLesson({ ...premiumOnly, subscriptions: [sub()] })).toBe("needs_subscription");
    expect(canAccessLesson({ ...premiumOnly, subscriptions: [sub({ plan: "premium", courseId: null })] })).toBe("ok");
    // безкоштовні уроки доступні всім
    expect(canAccessLesson({ ...premiumOnly, lessonOrder: 1 })).toBe("ok");
  });

  it("скасована підписка діє до кінця місяця, прострочена — 3 дні пільги", () => {
    expect(isSubscriptionLive(sub({ status: "canceled", currentPeriodEnd: inDays(2) }), NOW)).toBe(true);
    expect(isSubscriptionLive(sub({ status: "canceled", currentPeriodEnd: inDays(-1) }), NOW)).toBe(false);
    expect(isSubscriptionLive(sub({ status: "past_due", currentPeriodEnd: inDays(-2) }), NOW)).toBe(true);
    expect(isSubscriptionLive(sub({ status: "past_due", currentPeriodEnd: inDays(-4) }), NOW)).toBe(false);
    expect(isSubscriptionLive(sub({ status: "pending" }), NOW)).toBe(false);
  });

  it("продовження на місяць", () => {
    expect(extendPeriod(null, new Date("2026-01-31T10:00:00Z")).toISOString().slice(0, 10)).toBe("2026-02-28");
    expect(extendPeriod(new Date("2026-10-15T10:00:00Z"), NOW).toISOString().slice(0, 10)).toBe("2026-11-15");
    // якщо підписка вже закінчилась — рахуємо від сьогодні
    expect(extendPeriod(new Date("2026-08-01T10:00:00Z"), NOW).toISOString().slice(0, 10)).toBe("2026-10-28");
  });
});

describe("гейміфікація", () => {
  it("рівні", () => {
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(640)).toMatchObject({ level: 4, title: "Дослідник", toNext: 160 });
    expect(levelFromXp(5000).nextXp).toBeNull();
  });

  it("серія днів", () => {
    const d = (s: string) => new Date(s);
    const acts = [d("2026-09-28T08:00:00Z"), d("2026-09-27T08:00:00Z"), d("2026-09-26T08:00:00Z"), d("2026-09-20T08:00:00Z")];
    expect(streakDays(acts, NOW)).toBe(3);
    // сьогодні ще не вчився — серія з учора зберігається
    expect(streakDays(acts.slice(1), NOW)).toBe(2);
    expect(streakDays([], NOW)).toBe(0);
  });

  it("бейджі", () => {
    const b = computeBadges({ completedLessons: 5, submittedHomework: 1, streak: 7, finishedCourses: 0 });
    expect(b.filter((x) => x.earned).map((x) => x.id)).toEqual(["first-lesson", "five-lessons", "streak-7"]);
  });
});

describe("WayForPay", () => {
  it("рядок підпису збігається з прикладом із документації", () => {
    const s = purchaseSignatureString({
      merchantAccount: "test_merchant",
      merchantDomainName: "www.market.ua",
      orderReference: "DH783023",
      orderDate: 1415379863,
      amount: "1547.36",
      currency: "UAH",
      productName: ["Процесор Intel Core i5-4670 3.4GHz", "Пам'ять Kingston DDR3-1600 4096MB PC3-12800"],
      productCount: [1, 1],
      productPrice: [1000, 547.36],
    });
    expect(s).toBe(
      "test_merchant;www.market.ua;DH783023;1415379863;1547.36;UAH;Процесор Intel Core i5-4670 3.4GHz;Пам'ять Kingston DDR3-1600 4096MB PC3-12800;1;1;1000;547.36",
    );
  });

  it("HMAC_MD5 працює як стандартний", () => {
    // відомий тест-вектор RFC 2104
    expect(hmacMd5("what do ya want for nothing?", "Jefe")).toBe("750c783e6ab0b503eaa86e310a5db738");
  });

  it("форма оплати містить підпис і регулярний платіж", () => {
    const cfg = { merchantAccount: "m", merchantDomainName: "itcodecraft.tech", secretKey: "k" };
    const fields = new Map(
      buildPurchaseFields(cfg, {
        orderReference: "ITC-1",
        orderDate: 1700000000,
        amount: 449,
        productName: "Підписка",
        returnUrl: "https://x/r",
        serviceUrl: "https://x/s",
        nextChargeDate: new Date(2026, 9, 28),
        regularEndDate: new Date(2029, 8, 28),
      }),
    );
    expect(fields.get("amount")).toBe("449.00");
    expect(fields.get("regularMode")).toBe("monthly");
    expect(fields.get("dateNext")).toBe("28.10.2026");
    expect(fields.get("merchantSignature")).toBe(hmacMd5("m;itcodecraft.tech;ITC-1;1700000000;449.00;UAH;Підписка;1;449.00", "k"));
  });

  it("перевірка підпису callback-а", () => {
    const c: WfpCallback = {
      merchantAccount: "m",
      orderReference: "ITC-1",
      amount: 449,
      currency: "UAH",
      authCode: "541963",
      cardPan: "41****8217",
      transactionStatus: "Approved",
      reasonCode: 1100,
      merchantSignature: "",
    };
    expect(callbackSignatureString(c)).toBe("m;ITC-1;449;UAH;541963;41****8217;Approved;1100");
    c.merchantSignature = hmacMd5(callbackSignatureString(c), "k");
    expect(verifyCallback(c, "k")).toBe(true);
    expect(verifyCallback({ ...c, amount: 1 }, "k")).toBe(false);
    expect(verifyCallback(c, "wrong")).toBe(false);
  });

  it("відповідь accept підписана", () => {
    expect(acceptResponse("ITC-1", "k", 1415379863)).toEqual({
      orderReference: "ITC-1",
      status: "accept",
      time: 1415379863,
      signature: hmacMd5("ITC-1;accept;1415379863", "k"),
    });
  });

  it("розбирає тіло і як JSON, і як form-urlencoded", () => {
    const json = JSON.stringify({ orderReference: "ITC-1", transactionStatus: "Approved" });
    expect(parseCallbackBody(json)?.orderReference).toBe("ITC-1");
    expect(parseCallbackBody(encodeURIComponent(json))?.orderReference).toBe("ITC-1");
    expect(parseCallbackBody("garbage")).toBeNull();
  });

  it("формат дати", () => {
    expect(wfpDate(new Date(2026, 0, 5))).toBe("05.01.2026");
  });
});

describe("уроки й тести", () => {
  it("розбирає контент уроку за типом і відкидає некоректні питання", () => {
    expect(parseLessonContent("text", { markdown: "# Привіт" })).toEqual({ markdown: "# Привіт", videoUrl: null, questions: [] });
    expect(parseLessonContent("video", { url: "https://v/1.mp4" }).videoUrl).toBe("https://v/1.mp4");
    const quiz = parseLessonContent("quiz", {
      questions: [{ q: "2+2?", options: ["3", "4"], answer: 1 }, { q: "зламане питання" }],
    });
    expect(quiz.questions).toHaveLength(1);
    expect(parseLessonContent("text", null)).toEqual({ markdown: "", videoUrl: null, questions: [] });
  });

  it("тест зараховується від 60% правильних відповідей", () => {
    const qs = [0, 1, 2, 0, 1].map((answer) => ({ q: "?", options: ["a", "b", "c"], answer }));
    expect(gradeQuiz(qs, [0, 1, 2, 2, 2])).toEqual({ correct: 3, total: 5, passed: true });
    expect(gradeQuiz(qs, [0, 1, 0, 2, 2])).toEqual({ correct: 2, total: 5, passed: false });
    expect(gradeQuiz(qs, [-1, -1, -1, -1, -1]).passed).toBe(false);
  });
});

describe("гроші", () => {
  it("копійки → гривні", () => {
    expect(formatUah(44900).replace(/\s/g, " ")).toBe("449 грн");
    expect(formatUah(44950).replace(/\s/g, " ")).toBe("449,50 грн");
  });
});
