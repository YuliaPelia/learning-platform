"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/db";
import { requireUser } from "@/lib/dal";
import { overlaps } from "@/lib/planner";
import {
  PlannerIdSchema,
  ScheduleSlotSchema,
  StudyProfileSchema,
  StudyTaskSchema,
  firstError,
  keepValues,
  type FormState,
} from "@/lib/validation";

/**
 * Планувальник учня: задачі, розклад і навантаження.
 * Усі дії — лише для учня і лише над його власними записами (studentId у кожному where).
 */

const PAGE = "/cabinet/student";
const MAX_TASKS = 200;
const MAX_SLOTS = 80;

export async function addTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const student = await requireUser("student");
  const parsed = StudyTaskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error), values: keepValues(formData) };
  if ((await prisma.studyTask.count({ where: { studentId: student.id } })) >= MAX_TASKS) {
    return { error: "Задач забагато — видали кілька виконаних", values: keepValues(formData) };
  }
  await prisma.studyTask.create({ data: { studentId: student.id, ...parsed.data } });
  revalidatePath(PAGE);
  return { ok: true };
}

export async function toggleTask(formData: FormData) {
  const student = await requireUser("student");
  const id = PlannerIdSchema.safeParse(formData.get("taskId"));
  if (!id.success) return;
  const task = await prisma.studyTask.findFirst({ where: { id: id.data, studentId: student.id }, select: { done: true } });
  if (!task) return;
  await prisma.studyTask.update({ where: { id: id.data }, data: { done: !task.done, doneAt: task.done ? null : new Date() } });
  revalidatePath(PAGE);
}

export async function deleteTask(formData: FormData) {
  const student = await requireUser("student");
  const id = PlannerIdSchema.safeParse(formData.get("taskId"));
  if (!id.success) return;
  await prisma.studyTask.deleteMany({ where: { id: id.data, studentId: student.id } });
  revalidatePath(PAGE);
}

export async function addSlot(_prev: FormState, formData: FormData): Promise<FormState> {
  const student = await requireUser("student");
  const parsed = ScheduleSlotSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error), values: keepValues(formData) };
  const slots = await prisma.scheduleSlot.findMany({ where: { studentId: student.id }, select: { weekday: true, startMinute: true, durationMinutes: true } });
  if (slots.length >= MAX_SLOTS) return { error: "Розклад переповнений — видали кілька занять", values: keepValues(formData) };
  if (overlaps(slots, parsed.data)) return { error: "На цей час уже є заняття", values: keepValues(formData) };
  await prisma.scheduleSlot.create({ data: { studentId: student.id, ...parsed.data } });
  revalidatePath(PAGE);
  return { ok: true };
}

export async function deleteSlot(formData: FormData) {
  const student = await requireUser("student");
  const id = PlannerIdSchema.safeParse(formData.get("slotId"));
  if (!id.success) return;
  await prisma.scheduleSlot.deleteMany({ where: { id: id.data, studentId: student.id } });
  revalidatePath(PAGE);
}

export async function saveStudyProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const student = await requireUser("student");
  const parsed = StudyProfileSchema.safeParse({
    minutesPerDay: formData.get("minutesPerDay"),
    studyDays: formData.getAll("studyDays"),
    busyNote: formData.get("busyNote") ?? "",
    goal: formData.get("goal") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error), values: keepValues(formData) };
  const data = { ...parsed.data, studyDays: [...new Set(parsed.data.studyDays)].sort() };
  await prisma.studyProfile.upsert({ where: { studentId: student.id }, create: { studentId: student.id, ...data }, update: data });
  revalidatePath(PAGE);
  return { ok: true };
}
