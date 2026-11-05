import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUser: vi.fn(),
  taskFindFirst: vi.fn(),
  taskUpdate: vi.fn(),
  taskDeleteMany: vi.fn(),
  taskCount: vi.fn(),
  taskCreate: vi.fn(),
  slotFindMany: vi.fn(),
  slotCreate: vi.fn(),
  slotDeleteMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/dal", () => ({ requireUser: m.requireUser }));
vi.mock("@/db", () => {
  const prisma = {
    studyTask: { findFirst: m.taskFindFirst, update: m.taskUpdate, deleteMany: m.taskDeleteMany, count: m.taskCount, create: m.taskCreate },
    scheduleSlot: { findMany: m.slotFindMany, create: m.slotCreate, deleteMany: m.slotDeleteMany },
  };
  return { prisma };
});

import { addSlot, deleteSlot, deleteTask, toggleTask } from "@/actions/planner";

const ID = "11111111-1111-4111-8111-111111111111";
const form = (f: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(f)) fd.set(k, v);
  return fd;
};

beforeEach(() => {
  vi.clearAllMocks();
  m.requireUser.mockResolvedValue({ id: "s1", name: "Іра", birthYear: 2013 });
});

describe("лише свої записи", () => {
  it("усі дії вимагають роль student", async () => {
    await toggleTask(form({ taskId: ID }));
    expect(m.requireUser).toHaveBeenCalledWith("student");
  });
  it("чужу задачу не перемкнути, видалення — лише з фільтром за учнем", async () => {
    m.taskFindFirst.mockResolvedValue(null);
    await toggleTask(form({ taskId: ID }));
    expect(m.taskFindFirst.mock.calls[0][0].where).toEqual({ id: ID, studentId: "s1" });
    expect(m.taskUpdate).not.toHaveBeenCalled();
    await deleteTask(form({ taskId: ID }));
    expect(m.taskDeleteMany).toHaveBeenCalledWith({ where: { id: ID, studentId: "s1" } });
    await deleteSlot(form({ slotId: ID }));
    expect(m.slotDeleteMany).toHaveBeenCalledWith({ where: { id: ID, studentId: "s1" } });
  });
  it("заняття не накладається на наявне", async () => {
    m.slotFindMany.mockResolvedValue([{ weekday: 1, startMinute: 1020, durationMinutes: 60 }]);
    const r = await addSlot(undefined, form({ weekday: "1", start: "17:30", durationMinutes: "30", title: "Python", kind: "lesson" }));
    expect(r?.error).toMatch(/уже є заняття/);
    expect(m.slotCreate).not.toHaveBeenCalled();
  });
});
