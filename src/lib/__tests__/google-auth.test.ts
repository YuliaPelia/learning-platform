import { beforeEach, describe, expect, it } from "vitest";
import {
  applyGoogleProfile,
  googleAuthUrl,
  readGoogleSignup,
  safeNext,
  signGoogleSignup,
  type GoogleAccount,
} from "@/lib/google-auth";

const parent = (over: Partial<GoogleAccount> = {}): GoogleAccount => ({
  id: "p1",
  role: "parent",
  email: "parent@gmail.com",
  login: "parent@gmail.com",
  googleSub: null,
  ...over,
});

describe("google auth helpers", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "s".repeat(40);
  });

  it("safeNext приймає лише внутрішній шлях", () => {
    expect(safeNext("/cabinet/parent")).toBe("/cabinet/parent");
    expect(safeNext("https://evil.test")).toBeNull();
    expect(safeNext("//evil.test")).toBeNull();
    expect(safeNext(null)).toBeNull();
  });

  it("googleAuthUrl збирає адресу з кодом, scope і state", () => {
    const url = new URL(googleAuthUrl({ state: "abc", redirectUri: "http://localhost:3000/api/auth/google/callback", clientId: "cid" }));
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("state")).toBe("abc");
    expect(url.searchParams.get("client_id")).toBe("cid");
    expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:3000/api/auth/google/callback");
  });

  it.each(["parent", "student", "teacher", "admin"] as const)("наявна роль %s входить і отримує googleSub, якщо його не було", (role) => {
    const decision = applyGoogleProfile(null, parent({ id: role, role, email: "a@gmail.com", login: "a@gmail.com" }), {
      sub: "sub-1",
      email: "a@gmail.com",
      emailVerified: true,
    });
    expect(decision).toMatchObject({ type: "sign-in", userId: role, role, linkSub: true });
  });

  it("вже прив'язаний sub не перезаписується", () => {
    const decision = applyGoogleProfile(parent({ googleSub: "sub-1" }), parent({ googleSub: "sub-1" }), {
      sub: "sub-1",
      email: "parent@gmail.com",
      emailVerified: true,
    });
    expect(decision).toMatchObject({ type: "sign-in", linkSub: false, emailUpdate: undefined });
  });

  it("чужий googleSub відхиляється", () => {
    const decision = applyGoogleProfile(null, parent({ googleSub: "other" }), {
      sub: "sub-1",
      email: "parent@gmail.com",
      emailVerified: true,
    });
    expect(decision).toEqual({ type: "reject", reason: "sub-mismatch" });
  });

  it("sub і email вказують на різних людей — відмова", () => {
    const decision = applyGoogleProfile(parent({ id: "a", googleSub: "sub-1" }), parent({ id: "b", email: "new@gmail.com" }), {
      sub: "sub-1",
      email: "new@gmail.com",
      emailVerified: true,
    });
    expect(decision).toEqual({ type: "reject", reason: "sub-mismatch" });
  });

  it("непідтверджена пошта відхиляється", () => {
    expect(applyGoogleProfile(null, null, { sub: "s", email: "a@gmail.com", emailVerified: false })).toEqual({
      type: "reject",
      reason: "unverified",
    });
  });

  it("невідома пошта веде на створення акаунта", () => {
    expect(applyGoogleProfile(null, null, { sub: "s", email: "new@gmail.com", emailVerified: true })).toEqual({ type: "signup" });
  });

  it("зміна пошти оновлює login, якщо він дорівнював старій пошті", () => {
    const decision = applyGoogleProfile(parent({ googleSub: "sub-1", email: "old@gmail.com", login: "old@gmail.com" }), null, {
      sub: "sub-1",
      email: "new@gmail.com",
      emailVerified: true,
    });
    expect(decision).toMatchObject({ type: "sign-in", emailUpdate: { email: "new@gmail.com", login: "new@gmail.com" } });
  });

  it("квиток реєстрації живе 10 хвилин і не приймає чужий підпис", async () => {
    const token = await signGoogleSignup({ email: "a@gmail.com", name: "Олена", sub: "sub", next: "/pricing" });
    await expect(readGoogleSignup(token)).resolves.toEqual({ email: "a@gmail.com", name: "Олена", sub: "sub", next: "/pricing" });
    await expect(readGoogleSignup(token + "x")).resolves.toBeNull();
    await expect(readGoogleSignup(undefined)).resolves.toBeNull();
  });
});
