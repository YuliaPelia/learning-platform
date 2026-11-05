import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { averageScore, formatDuration, formatTime, greeting, kyivWeekday, loadLevel, minutesByDay, overlaps, parseTime, pluralLessons, robotMessage, taskStats } from "@/lib/planner";
import { ScheduleSlotSchema, StudyProfileSchema, StudyTaskSchema } from "@/lib/validation";

describe("час і тривалість", () => {
  it("parseTime / formatTime", () => {
    expect(parseTime("17:30")).toBe(1050);
    expect(parseTime("7:05")).toBe(425);
    expect(parseTime("24:00")).toBeNull();
    expect(parseTime("abc")).toBeNull();
    expect(formatTime(1050)).toBe("17:30");
    expect(formatTime(425)).toBe("07:05");
  });
  it("formatDuration і множина «заняття/занять»", () => {
    expect(formatDuration(45)).toBe("45 хв");
    expect(formatDuration(90)).toBe("1 год 30 хв");
    expect(formatDuration(120)).toBe("2 год");
    expect([1, 2, 5, 11, 21, 22].map(pluralLessons)).toEqual(["заняття", "заняття", "занять", "занять", "заняття", "заняття"]);
  });
  it("день тижня й привітання за київським часом", () => {
    expect(kyivWeekday(new Date("2026-11-02T10:00:00Z"))).toBe(0); // понеділок
    expect(kyivWeekday(new Date("2026-11-08T22:30:00Z"))).toBe(0); // неділя 22:30 UTC = понеділок 00:30 у Києві
    expect(greeting(8)).toBe("Доброго ранку");
    expect(greeting(14)).toBe("Доброго дня");
    expect(greeting(20)).toBe("Доброго вечора");
  });
});

describe("навантаження", () => {
  const slots = [
    { weekday: 0, startMinute: 1020, durationMinutes: 30, kind: "lesson" as const },
    { weekday: 0, startMinute: 1050, durationMinutes: 15, kind: "rest" as const },
    { weekday: 2, startMinute: 960, durationMinutes: 60, kind: "homework" as const },
  ];
  it("відпочинок не рахується як навчання", () => {
    expect(minutesByDay(slots)).toEqual([30, 0, 60, 0, 0, 0, 0]);
  });
  it("накладки — лише в той самий день і час", () => {
    expect(overlaps(slots, { weekday: 0, startMinute: 1030, durationMinutes: 10 })).toBe(true);
    expect(overlaps(slots, { weekday: 0, startMinute: 1065, durationMinutes: 10 })).toBe(false); // одразу після перерви
    expect(overlaps(slots, { weekday: 1, startMinute: 1020, durationMinutes: 30 })).toBe(false);
  });
  it("рівень навантаження відносно мети", () => {
    expect(loadLevel(0, 45)).toBe("free");
    expect(loadLevel(50, 45)).toBe("ok");
    expect(loadLevel(60, 45)).toBe("over");
  });
});

describe("статистика", () => {
  const now = new Date("2026-11-05T12:00:00Z");
  it("задачі: відкриті, виконані за тиждень, прострочені", () => {
    const s = taskStats(
      [
        { done: false, doneAt: null, dueDate: new Date("2026-11-03T00:00:00Z") },
        { done: false, doneAt: null, dueDate: new Date("2026-11-05T00:00:00Z") },
        { done: true, doneAt: new Date("2026-11-04T10:00:00Z"), dueDate: null },
        { done: true, doneAt: new Date("2026-10-01T10:00:00Z"), dueDate: null },
      ],
      now,
    );
    expect(s).toEqual({ open: 2, doneThisWeek: 1, overdue: 1 });
  });
  it("середня оцінка — лише з оцінених", () => {
    expect(averageScore([{ score: 8, maxScore: 10 }, { score: 5, maxScore: 5 }, { score: null, maxScore: 10 }])).toBe(90);
    expect(averageScore([{ score: null, maxScore: 10 }])).toBeNull();
  });
  it("робот спершу нагадує про прострочену домашку, потім про сьогоднішні заняття", () => {
    const base = { todaySlots: [], overdueHomework: 0, dueSoonHomework: 0, openTasks: 0, streak: 0, hasSchedule: true };
    expect(robotMessage({ ...base, overdueHomework: 1, todaySlots: [{ title: "Python", startMinute: 1020 }] })).toContain("прострочена");
    expect(robotMessage({ ...base, todaySlots: [{ title: "Python", startMinute: 1020 }] })).toContain("17:00");
    expect(robotMessage({ ...base, hasSchedule: false })).toContain("розклад");
  });
});

describe("форми планувальника", () => {
  it("заняття: час → хвилини, не можна за північ", () => {
    expect(ScheduleSlotSchema.parse({ weekday: "2", start: "17:30", durationMinutes: "45", title: "Python", kind: "lesson" })).toEqual({
      weekday: 2, startMinute: 1050, durationMinutes: 45, title: "Python", kind: "lesson",
    });
    expect(ScheduleSlotSchema.safeParse({ weekday: "2", start: "23:30", durationMinutes: "60", title: "Python", kind: "lesson" }).success).toBe(false);
    expect(ScheduleSlotSchema.safeParse({ weekday: "7", start: "10:00", durationMinutes: "30", title: "Python", kind: "lesson" }).success).toBe(false);
  });
  it("задача: порожні дата й хвилини — null", () => {
    expect(StudyTaskSchema.parse({ title: "Домашка", dueDate: "", estMinutes: "", priority: "high" })).toEqual({ title: "Домашка", dueDate: null, estMinutes: null, priority: "high" });
    expect(StudyTaskSchema.parse({ title: "Домашка", dueDate: "2026-11-10", estMinutes: "30" }).dueDate).toEqual(new Date("2026-11-10T00:00:00Z"));
  });
  it("навантаження: хоча б один день і розумні хвилини", () => {
    expect(StudyProfileSchema.safeParse({ minutesPerDay: "45", studyDays: [], busyNote: "", goal: "" }).success).toBe(false);
    expect(StudyProfileSchema.safeParse({ minutesPerDay: "600", studyDays: ["1"], busyNote: "", goal: "" }).success).toBe(false);
    expect(StudyProfileSchema.parse({ minutesPerDay: "45", studyDays: ["1", "3"], busyNote: "школа", goal: "" }).studyDays).toEqual([1, 3]);
  });
});
