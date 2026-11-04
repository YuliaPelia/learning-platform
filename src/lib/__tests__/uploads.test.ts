import { describe, expect, it } from "vitest";
import { UPLOAD_KINDS, isUploadKind } from "@/lib/uploads";
import { CourseSchema } from "@/lib/validation";

const course = { title: "Python", slug: "python", description: "", category: "code", ageFrom: "9", ageTo: "17", status: "soon", minPlan: "basic", sortOrder: "0" };

describe("uploads", () => {
  it("розпізнає лише відомі типи", () => {
    expect(isUploadKind("cover")).toBe(true);
    expect(isUploadKind("video")).toBe(true);
    expect(isUploadKind("../etc")).toBe(false);
    expect(isUploadKind(null)).toBe(false);
  });

  it("обкладинки — лише адмін і лише зображення, відео — адмін і викладач", () => {
    expect(UPLOAD_KINDS.cover.roles).toEqual(["admin"]);
    expect(UPLOAD_KINDS.cover.contentTypes).not.toContain("image/svg+xml");
    expect(UPLOAD_KINDS.video.roles).toContain("teacher");
    expect(UPLOAD_KINDS.video.contentTypes).toEqual(["video/mp4", "video/webm"]);
  });
});

describe("CourseSchema.coverUrl", () => {
  it("порожнє й відсутнє — без обкладинки", () => {
    expect(CourseSchema.parse({ ...course, coverUrl: "" }).coverUrl).toBe("");
    expect(CourseSchema.parse(course).coverUrl).toBe("");
  });
  it("приймає https і відхиляє інше", () => {
    expect(CourseSchema.safeParse({ ...course, coverUrl: "https://x.public.blob.vercel-storage.com/covers/a.png" }).success).toBe(true);
    expect(CourseSchema.safeParse({ ...course, coverUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(CourseSchema.safeParse({ ...course, coverUrl: "http://x/a.png" }).success).toBe(false);
  });
});
