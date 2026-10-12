import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, create, requireUser, revalidatePath } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  requireUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/db", () => ({ prisma: { submission: { findUnique }, message: { create } } }));
vi.mock("@/lib/dal", () => ({ requireUser }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { sendMessage } from "@/actions/messages";

const SUB = "123e4567-e89b-42d3-a456-426614174000";

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

describe("sendMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ id: "s1", role: "student" });
    findUnique.mockResolvedValue({ id: SUB, userId: "s1", needsTeacher: true });
  });

  it("власник-учень може писати у свій тред", async () => {
    await sendMessage(form({ submissionId: SUB, body: "  привіт  " }));
    expect(requireUser).toHaveBeenCalledWith("student", "teacher");
    expect(create).toHaveBeenCalledWith({ data: { submissionId: SUB, authorId: "s1", body: "привіт" } });
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("чужий учень не може писати", async () => {
    findUnique.mockResolvedValue({ id: SUB, userId: "other", needsTeacher: true });
    await sendMessage(form({ submissionId: SUB, body: "hi" }));
    expect(create).not.toHaveBeenCalled();
  });

  it("тред без needsTeacher закритий і для учня, і для викладача", async () => {
    findUnique.mockResolvedValue({ id: SUB, userId: "s1", needsTeacher: false });
    await sendMessage(form({ submissionId: SUB, body: "hi" }));
    requireUser.mockResolvedValue({ id: "t1", role: "teacher" });
    await sendMessage(form({ submissionId: SUB, body: "hi" }));
    expect(create).not.toHaveBeenCalled();
  });

  it("викладач може писати в тред із needsTeacher", async () => {
    requireUser.mockResolvedValue({ id: "t1", role: "teacher" });
    await sendMessage(form({ submissionId: SUB, body: "відповідь" }));
    expect(create).toHaveBeenCalledWith({ data: { submissionId: SUB, authorId: "t1", body: "відповідь" } });
  });

  it("неіснуюча submission -> нічого не створюється", async () => {
    findUnique.mockResolvedValue(null);
    await sendMessage(form({ submissionId: SUB, body: "hi" }));
    expect(create).not.toHaveBeenCalled();
  });

  it("не-UUID, порожнє й задовге повідомлення відхиляються до звернення до БД", async () => {
    await sendMessage(form({ submissionId: "x", body: "hi" }));
    await sendMessage(form({ submissionId: SUB, body: "   " }));
    await sendMessage(form({ submissionId: SUB, body: "a".repeat(2001) }));
    await sendMessage(form({ body: "hi" }));
    expect(findUnique).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("рівно 2000 символів приймається", async () => {
    await sendMessage(form({ submissionId: SUB, body: "a".repeat(2000) }));
    expect(create).toHaveBeenCalledTimes(1);
  });
});
