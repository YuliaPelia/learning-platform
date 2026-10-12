import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, updateMany, requireUser, revalidatePath } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  requireUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/db", () => ({ prisma: { submission: { findUnique, updateMany } } }));
vi.mock("@/lib/dal", () => ({ requireUser }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { reviewHomework } from "@/actions/teacher";

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

describe("reviewHomework", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ id: "t1" });
    findUnique.mockResolvedValue({ homework: { maxScore: 10 } });
    updateMany.mockResolvedValue({ count: 1 });
  });

  it("оновлює лише submitted + needsTeacher (атомарно)", async () => {
    await reviewHomework(form({ homeworkId: "s1", score: "7", comment: " ok " }));
    expect(requireUser).toHaveBeenCalledWith("teacher");
    expect(updateMany).toHaveBeenCalledTimes(1);
    const arg = updateMany.mock.calls[0][0];
    expect(arg.where).toEqual({ id: "s1", status: "submitted", needsTeacher: true });
    expect(arg.data).toMatchObject({ status: "reviewed", score: 7, teacherComment: "ok" });
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("не робить revalidate, якщо count === 0 (pending/reviewed)", async () => {
    updateMany.mockResolvedValue({ count: 0 });
    await reviewHomework(form({ homeworkId: "s1", score: "5" }));
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("клемпить score до maxScore і до 0", async () => {
    await reviewHomework(form({ homeworkId: "s1", score: "999" }));
    expect(updateMany.mock.calls[0][0].data.score).toBe(10);
    await reviewHomework(form({ homeworkId: "s1", score: "-5" }));
    expect(updateMany.mock.calls[1][0].data.score).toBe(0);
  });

  it("відсутня submission -> updateMany не викликається", async () => {
    findUnique.mockResolvedValue(null);
    await reviewHomework(form({ homeworkId: "nope", score: "5" }));
    expect(updateMany).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
