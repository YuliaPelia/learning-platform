import { describe, expect, it } from "vitest";
import { bucketByDay, deltaPercent, sumPoints } from "../stats-utils";

const now = new Date("2026-10-21T12:00:00Z");
const at = (iso: string) => new Date(iso);

describe("bucketByDay", () => {
  it("повертає рівно N днів, останній — сьогодні, дні без подій = 0", () => {
    const pts = bucketByDay([], 7, now);
    expect(pts).toHaveLength(7);
    expect(pts[6].day).toBe("2026-10-21");
    expect(pts[0].day).toBe("2026-10-15");
    expect(sumPoints(pts)).toBe(0);
  });

  it("рахує події й суми по днях за київським часом", () => {
    const pts = bucketByDay(
      [
        { at: at("2026-10-21T08:00:00Z"), value: 500 },
        { at: at("2026-10-21T09:00:00Z"), value: 250 },
        { at: at("2026-10-20T10:00:00Z") },
        // 21:30 UTC 20-го жовтня — це вже 21-ше за Києвом (літній час UTC+3 діє до 25.10)
        { at: at("2026-10-20T21:30:00Z"), value: 100 },
      ],
      3,
      now,
    );
    expect(pts.map((p) => p.value)).toEqual([0, 1, 850]);
  });

  it("ігнорує події поза вікном і без дати", () => {
    const pts = bucketByDay([{ at: at("2026-09-01T00:00:00Z") }, { at: null }], 7, now);
    expect(sumPoints(pts)).toBe(0);
  });
});

describe("deltaPercent", () => {
  it("рахує зміну у відсотках", () => {
    expect(deltaPercent(150, 100)).toBe(50);
    expect(deltaPercent(50, 100)).toBe(-50);
  });
  it("повертає null, якщо попереднього періоду не було", () => {
    expect(deltaPercent(10, 0)).toBeNull();
  });
});
