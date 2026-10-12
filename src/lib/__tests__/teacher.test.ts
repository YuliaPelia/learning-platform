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

const ID = "123e4567-e89b-42d3-a456-426614174000";

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
    await reviewHomework(form({ homeworkId: ID, score: "7", comment: " ok " }));
    expect(requireUser).toHaveBeenCalledWith("teacher");
    expect(updateMany).toHaveBeenCalledTimes(1);
    const arg = updateMany.mock.calls[0][0];
    expect(arg.where).toEqual({ id: ID, status: "submitted", needsTeacher: true });
    expect(arg.data).toMatchObject({ status: "reviewed", score: 7, teacherComment: "ok" });
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("не робить revalidate, якщо count === 0 (pending/reviewed)", async () => {
    updateMany.mockResolvedValue({ count: 0 });
    await reviewHomework(form({ homeworkId: ID, score: "5" }));
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("клемпить score до maxScore і до 0", async () => {
    await reviewHomework(form({ homeworkId: ID, score: "999" }));
    expect(updateMany.mock.calls[0][0].data.score).toBe(10);
    await reviewHomework(form({ homeworkId: ID, score: "-5" }));
    expect(updateMany.mock.calls[1][0].data.score).toBe(0);
  });

  it("відсутня submission -> updateMany не викликається", async () => {
    findUnique.mockResolvedValue(null);
    await reviewHomework(form({ homeworkId: ID, score: "5" }));
    expect(updateMany).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("не-UUID id -> тихий return, БД не викликається", async () => {
    await expect(reviewHomework(form({ homeworkId: "s1", score: "5" }))).resolves.toBeUndefined();
    await reviewHomework(form({ score: "5" }));
    expect(findUnique).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("нечисловий або відсутній score => 0", async () => {
    await reviewHomework(form({ homeworkId: ID, score: "abc" }));
    expect(updateMany.mock.calls[0][0].data.score).toBe(0);
    await reviewHomework(form({ homeworkId: ID }));
    expect(updateMany.mock.calls[1][0].data.score).toBe(0);
  });

  it("коментар: обрізається до 2000, порожній => null", async () => {
    await reviewHomework(form({ homeworkId: ID, score: "5", comment: "a".repeat(2500) }));
    expect(updateMany.mock.calls[0][0].data.teacherComment).toBe("a".repeat(2000));
    await reviewHomework(form({ homeworkId: ID, score: "5", comment: "   " }));
    expect(updateMany.mock.calls[1][0].data.teacherComment).toBeNull();
    await reviewHomework(form({ homeworkId: ID, score: "5" }));
    expect(updateMany.mock.calls[2][0].data.teacherComment).toBeNull();
  });
});
