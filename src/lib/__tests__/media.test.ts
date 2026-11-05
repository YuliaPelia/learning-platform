import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { isServablePath, mediaSrc, privateBlobPathname, verifyMediaSignature, VIDEO_LINK_TTL_SECONDS } from "@/lib/media";
import { coverPreviewSrc } from "@/lib/uploads";

const STORE = "https://abc123.private.blob.vercel-storage.com";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-test-secret-test-secret-123";
  process.env.APP_URL = "https://learn.example.com/";
});

const parse = (src: string) => {
  const u = new URL(src, "https://x");
  return { path: decodeURIComponent(u.pathname.replace("/api/media/", "")), exp: u.searchParams.get("exp"), sig: u.searchParams.get("sig") };
};

describe("media", () => {
  it("посилання YouTube і публічні файли не змінює", () => {
    expect(mediaSrc("https://www.youtube.com/embed/abc")).toBe("https://www.youtube.com/embed/abc");
    expect(mediaSrc("https://x.public.blob.vercel-storage.com/videos/a.mp4")).toBe("https://x.public.blob.vercel-storage.com/videos/a.mp4");
  });

  it("обкладинка — без підпису, і в браузері, і на сервері адреса однакова", () => {
    const url = `${STORE}/covers/py-Xyz.png`;
    expect(mediaSrc(url)).toBe("/api/media/covers/py-Xyz.png");
    expect(coverPreviewSrc(url)).toBe("/api/media/covers/py-Xyz.png");
    expect(mediaSrc(url, { absolute: true })).toBe("https://learn.example.com/api/media/covers/py-Xyz.png");
  });

  it("відео — підписане, підпис перевіряється і закінчується", () => {
    const now = Date.UTC(2026, 10, 5);
    const src = mediaSrc(`${STORE}/videos/lesson-1-Ab.mp4`, { now });
    expect(src).toMatch(/^\/api\/media\/videos\/lesson-1-Ab\.mp4\?exp=\d+&sig=/);
    const { path, exp, sig } = parse(src);
    expect(verifyMediaSignature(path, exp, sig, now)).toBe(true);
    expect(verifyMediaSignature(path, exp, sig, now + (VIDEO_LINK_TTL_SECONDS + 1) * 1000)).toBe(false);
    // чужий файл, підроблений термін чи підпис — відмова
    expect(verifyMediaSignature("videos/other.mp4", exp, sig, now)).toBe(false);
    expect(verifyMediaSignature(path, String(Number(exp) + 3600), sig, now)).toBe(false);
    expect(verifyMediaSignature(path, exp, "x", now)).toBe(false);
    expect(verifyMediaSignature(path, null, null, now)).toBe(false);
  });

  it("віддає лише наші папки без виходу за межі", () => {
    expect(isServablePath("videos/a.mp4")).toBe(true);
    expect(isServablePath("covers/a.png")).toBe(true);
    expect(isServablePath("videos/../secret.txt")).toBe(false);
    expect(isServablePath("other/a.mp4")).toBe(false);
    expect(isServablePath("videos")).toBe(false);
    expect(privateBlobPathname("http://abc.private.blob.vercel-storage.com/videos/a.mp4")).toBeNull();
  });
});
