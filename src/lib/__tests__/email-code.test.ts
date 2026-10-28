import { describe, expect, it } from "vitest";
import {
  EMAIL_CODE_RESEND_MS,
  emailCodeLetter,
  emailCodeMatches,
  generateEmailCode,
  hashEmailCode,
  resendWaitSeconds,
} from "@/lib/email-code";

const secret = "test-secret";

describe("код підтвердження пошти", () => {
  it("генерує рівно 6 цифр", () => {
    for (let i = 0; i < 30; i++) expect(generateEmailCode()).toMatch(/^\d{6}$/);
  });

  it("збігається лише з тим кодом, який хешували", () => {
    const hash = hashEmailCode("123456", secret);
    expect(emailCodeMatches("123456", hash, secret)).toBe(true);
    expect(emailCodeMatches("123457", hash, secret)).toBe(false);
    expect(emailCodeMatches("123456", hash, "other-secret")).toBe(false);
    expect(emailCodeMatches("123456", "не-хеш", secret)).toBe(false);
  });

  it("не дає надіслати лист повторно раніше ніж за хвилину", () => {
    const sentAt = new Date("2026-10-28T12:00:00Z");
    expect(resendWaitSeconds(sentAt, new Date(sentAt.getTime() + 1_000))).toBe(59);
    expect(resendWaitSeconds(sentAt, new Date(sentAt.getTime() + EMAIL_CODE_RESEND_MS))).toBe(0);
  });

  it("кладе код у текст листа", () => {
    expect(emailCodeLetter("042018").text).toContain("042018");
  });
});
