import { describe, expect, it } from "vitest";
import { canSubmitHomework } from "../access";
import { HOMEWORK_XP, LEVELS, computeBadges, dayKey, levelFromXp, streakDays, totalXp } from "../gamification";
import { gradeQuiz } from "../lesson-content";
import { LessonIdSchema, SubmitHomeworkSchema } from "../validation";

const at = (iso: string) => new Date(iso);

describe("рівні", () => {
  it("межі рівнів включно", () => {
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(199).level).toBe(1);
    expect(levelFromXp(200).level).toBe(2);
    expect(levelFromXp(1800).level).toBe(7);
  });
  it("максимальний рівень не має наступного", () => {
    const l = levelFromXp(99999);
    expect(l.nextXp).toBeNull();
    expect(l.progress).toBe(1);
    expect(LEVELS.at(-1)!.level).toBe(l.level);
  });
  it("від'ємний XP вважається нулем", () => {
    expect(levelFromXp(-50).level).toBe(1);
    expect(levelFromXp(-50).toNext).toBe(200);
  });
});

describe("XP", () => {
  it("рахується з фактів: кожен урок і домашка по одному разу", () => {
    expect(totalXp([10, 20], 2)).toBe(30 + 2 * HOMEWORK_XP);
    expect(totalXp([10, 20], 2)).toBe(totalXp([10, 20], 2)); // повторний підрахунок не змінює результат
    expect(totalXp([], 0)).toBe(0);
  });
});

describe("серія днів", () => {
  const now = at("2026-09-28T12:00:00Z");
  it("порожня активність — 0", () => expect(streakDays([], now)).toBe(0));
  it("кілька дій за день — один день", () => {
    expect(streakDays([at("2026-09-28T08:00:00Z"), at("2026-09-28T09:00:00Z")], now)).toBe(1);
  });
  it("серія, що закінчилась учора, жива", () => {
    expect(streakDays([at("2026-09-27T10:00:00Z"), at("2026-09-26T10:00:00Z")], now)).toBe(2);
  });
  it("пропуск дня обриває серію", () => {
    expect(streakDays([at("2026-09-28T10:00:00Z"), at("2026-09-26T10:00:00Z")], now)).toBe(1);
    expect(streakDays([at("2026-09-25T10:00:00Z")], now)).toBe(0);
  });
  it("стійка до переходу на літній час (23-годинна доба 29.03.2026 у Києві)", () => {
    const days = ["2026-03-27", "2026-03-28", "2026-03-29", "2026-03-30"].map((d) => at(`${d}T10:00:00Z`));
    expect(streakDays(days, at("2026-03-30T10:00:00Z"))).toBe(4);
    expect(dayKey(at("2026-03-29T10:00:00Z"))).toBe("2026-03-29");
  });
});

describe("бейджі", () => {
  const none = { completedLessons: 0, submittedHomework: 0, streak: 0, finishedCourses: 0 };
  const earned = (i: typeof none) => computeBadges(i).filter((b) => b.earned).map((b) => b.id);
  it("нічого не заробено на нулі", () => expect(earned(none)).toEqual([]));
  it("межі порогів", () => {
    expect(earned({ ...none, completedLessons: 1 })).toEqual(["first-lesson"]);
    expect(earned({ ...none, completedLessons: 4 })).toEqual(["first-lesson"]);
    expect(earned({ ...none, completedLessons: 5 })).toEqual(["first-lesson", "five-lessons"]);
    expect(earned({ ...none, submittedHomework: 2 })).toEqual([]);
    expect(earned({ ...none, submittedHomework: 3 })).toEqual(["homework"]);
    expect(earned({ ...none, streak: 6 })).toEqual([]);
    expect(earned({ ...none, streak: 7 })).toEqual(["streak-7"]);
    expect(earned({ ...none, finishedCourses: 1 })).toEqual(["course"]);
  });
});

describe("домашка", () => {
  it("перездача дозволена до перевірки, після reviewed — ні", () => {
    expect(canSubmitHomework("pending")).toBe(true);
    expect(canSubmitHomework("submitted")).toBe(true);
    expect(canSubmitHomework("reviewed")).toBe(false);
  });
  it("валідація відповіді", () => {
    const id = "6f1b1f0e-6a52-4c53-9f0e-3f2a0c2c9b11";
    expect(SubmitHomeworkSchema.safeParse({ homeworkId: id, answer: "   " }).success).toBe(false);
    expect(SubmitHomeworkSchema.safeParse({ homeworkId: "x", answer: "ok" }).success).toBe(false);
    expect(SubmitHomeworkSchema.safeParse({ homeworkId: id, answer: null }).success).toBe(false);
    const r = SubmitHomeworkSchema.parse({ homeworkId: id, answer: ` ${"a".repeat(20000)} ` });
    expect(r.answer).toHaveLength(10000);
  });
});

describe("тест на сервері", () => {
  const qs = [
    { q: "a", options: ["1", "2"], answer: 0 },
    { q: "b", options: ["1", "2"], answer: 1 },
    { q: "c", options: ["1", "2"], answer: 1 },
  ];
  it("-1 (немає відповіді) не зараховується", () => {
    expect(gradeQuiz(qs, [-1, -1, -1]).correct).toBe(0);
  });
  it("поріг 60%: 2 з 3 — так, 1 з 3 — ні", () => {
    expect(gradeQuiz(qs, [0, 1, 0]).passed).toBe(true);
    expect(gradeQuiz(qs, [0, 0, 0]).passed).toBe(false);
  });
});

describe("LessonIdSchema", () => {
  it("приймає uuid", () => {
    expect(LessonIdSchema.safeParse("123e4567-e89b-42d3-a456-426614174000").success).toBe(true);
  });
  it("відхиляє не-UUID, порожнє та null", () => {
    expect(LessonIdSchema.safeParse("abc").success).toBe(false);
    expect(LessonIdSchema.safeParse("").success).toBe(false);
    expect(LessonIdSchema.safeParse(null).success).toBe(false);
  });
});
