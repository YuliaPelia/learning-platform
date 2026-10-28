import { describe, expect, it } from "vitest";
import { accessEnd, appleNotificationState, googleState, statusFromStore } from "@/lib/iap/mapping";
import { parseProductId } from "@/lib/iap/products";

describe("товари IAP", () => {
  it("розбирає id і відкидає чужі", () => {
    expect(parseProductId("tech.itcodecraft.slot2.standard.monthly")).toEqual({ slot: 2, plan: "standard" });
    expect(parseProductId("tech.itcodecraft.slot4.basic.monthly")).toBeNull();
    expect(parseProductId("tech.itcodecraft.slot1.gold.monthly")).toBeNull();
    expect(parseProductId("com.other.app")).toBeNull();
  });
});

describe("стан магазину → статус підписки", () => {
  it("active/past_due зберігаються, решта — canceled", () => {
    expect(statusFromStore("active")).toBe("active");
    expect(statusFromStore("past_due")).toBe("past_due");
    expect(statusFromStore("canceled")).toBe("canceled");
    expect(statusFromStore("expired")).toBe("canceled");
    expect(statusFromStore("revoked")).toBe("canceled");
  });
  it("відкликана покупка (повернення коштів) закриває доступ одразу, решта — до кінця періоду", () => {
    const now = new Date("2026-11-01T00:00:00Z");
    const end = new Date("2026-12-01T00:00:00Z");
    expect(accessEnd("revoked", end, now)).toEqual(now);
    expect(accessEnd("active", end, now)).toEqual(end);
    expect(accessEnd("canceled", end, now)).toEqual(end);
  });
});

describe("сповіщення Apple V2", () => {
  it.each([
    ["SUBSCRIBED", undefined, "active"],
    ["DID_RENEW", undefined, "active"],
    ["DID_FAIL_TO_RENEW", "GRACE_PERIOD", "past_due"],
    ["DID_FAIL_TO_RENEW", undefined, "expired"],
    ["DID_CHANGE_RENEWAL_STATUS", "AUTO_RENEW_DISABLED", "canceled"],
    ["DID_CHANGE_RENEWAL_STATUS", "AUTO_RENEW_ENABLED", "active"],
    ["EXPIRED", "VOLUNTARY", "expired"],
    ["REFUND", undefined, "revoked"],
    ["REVOKE", undefined, "revoked"],
  ])("%s / %s → %s", (type, subtype, expected) => {
    expect(appleNotificationState(type, subtype)).toBe(expected);
  });
  it("невідомі й неважливі події ігноруються", () => {
    expect(appleNotificationState("TEST")).toBeNull();
    expect(appleNotificationState("PRICE_INCREASE")).toBeNull();
    expect(appleNotificationState("DID_CHANGE_RENEWAL_STATUS", "OTHER")).toBeNull();
  });
});

describe("стани Google Play", () => {
  it("мапінг subscriptionsv2", () => {
    expect(googleState("SUBSCRIPTION_STATE_ACTIVE")).toBe("active");
    expect(googleState("SUBSCRIPTION_STATE_CANCELED")).toBe("canceled");
    expect(googleState("SUBSCRIPTION_STATE_IN_GRACE_PERIOD")).toBe("past_due");
    expect(googleState("SUBSCRIPTION_STATE_ON_HOLD")).toBe("expired");
    expect(googleState("SUBSCRIPTION_STATE_EXPIRED")).toBe("expired");
    expect(googleState("щось нове")).toBe("expired"); // невідомий стан не дає доступу
  });
});
