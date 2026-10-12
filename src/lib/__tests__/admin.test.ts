import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUser: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  courseFind: vi.fn(),
  courseDelete: vi.fn(),
  lessonFind: vi.fn(),
  lessonFindFirst: vi.fn(),
  tx: vi.fn(),
}));

vi.mock("@/db", () => ({
  prisma: {
    course: { findUnique: m.courseFind, delete: m.courseDelete },
    lesson: { findUnique: m.lessonFind, findFirst: m.lessonFindFirst },
    $transaction: m.tx,
  },
}));
vi.mock("@/lib/dal", () => ({ requireUser: m.requireUser }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));

import { deleteCourse, deleteLesson, moveLesson, saveCourse, saveLesson } from "@/actions/admin";

const ID = "123e4567-e89b-42d3-a456-426614174000";
const form = (f: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(f)) fd.set(k, v);
  return fd;
};

describe("admin actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.requireUser.mockResolvedValue({ id: "a1", role: "admin" });
  });

  it("кожна action викликає requireUser('admin') і зупиняється, якщо не admin", async () => {
    m.requireUser.mockRejectedValue(new Error("REDIRECT:/"));
    const fd = form({ courseId: ID, lessonId: ID });
    for (const run of [
      () => saveCourse({}, fd),
      () => saveLesson({}, fd),
      () => deleteCourse(fd),
      () => deleteLesson(fd),
      () => moveLesson(fd),
    ]) {
      await expect(run()).rejects.toThrow("REDIRECT:/");
    }
    expect(m.requireUser).toHaveBeenCalledTimes(5);
    expect(m.requireUser).toHaveBeenCalledWith("admin");
    expect(m.courseDelete).not.toHaveBeenCalled();
  });

  it("deleteCourse з неправильним id не звертається до бази", async () => {
    await expect(deleteCourse(form({ courseId: "x" }))).rejects.toThrow("REDIRECT:/admin");
    expect(m.courseFind).not.toHaveBeenCalled();
  });

  it("deleteLesson/moveLesson з неправильним id нічого не роблять", async () => {
    await deleteLesson(form({ lessonId: "x" }));
    await moveLesson(form({ lessonId: "x" }));
    expect(m.lessonFind).not.toHaveBeenCalled();
  });

  it("saveCourse відхиляє невалідні дані", async () => {
    const r = await saveCourse({}, form({ title: "a" }));
    expect(r?.error).toBeTruthy();
  });

  it("saveLesson: тест без питань не зберігається, урок чужого курсу відхиляється", async () => {
    const base = { type: "quiz", title: "Тест", summary: "", xp: "10", videoUrl: "", markdown: "", homeworkTask: "", maxScore: "10", dueDays: "7", courseId: ID };
    const bad = await saveLesson({}, form({ ...base, questions: "[]" }));
    expect(bad?.error).toBeTruthy();

    m.courseFind.mockResolvedValue({ id: ID });
    m.lessonFindFirst.mockResolvedValue(null);
    const q = JSON.stringify([{ q: "2+2?", options: ["3", "4"], answer: 1 }]);
    const other = await saveLesson({}, form({ ...base, questions: q, lessonId: ID }));
    expect(other?.error).toBe("Урок не знайдено в цьому курсі");
    expect(m.tx).not.toHaveBeenCalled();
  });

  it("saveCourse/saveLesson з не-UUID id повертають помилку без звернення до бази", async () => {
    const course = { title: "Курс", slug: "kurs", description: "", category: "web", ageFrom: "8", ageTo: "12", minPlan: "basic", status: "published", sortOrder: "0", courseId: "x" };
    const rc = await saveCourse({}, form(course));
    expect(rc?.error).toBe("Курс не знайдено — можливо, його вже видалили");

    const base = { type: "text", title: "Урок", summary: "", xp: "10", videoUrl: "", markdown: "текст", homeworkTask: "", maxScore: "10", dueDays: "7" };
    const bc = await saveLesson({}, form({ ...base, courseId: "x" }));
    expect(bc?.error).toBe("Курс не знайдено");
    const bl = await saveLesson({}, form({ ...base, courseId: ID, lessonId: "x" }));
    expect(bl?.error).toBe("Урок не знайдено в цьому курсі");
    expect(m.courseFind).not.toHaveBeenCalled();
    expect(m.lessonFindFirst).not.toHaveBeenCalled();
  });
});
