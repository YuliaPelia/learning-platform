"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/db";
import { GOOGLE_SIGNUP_COOKIE, readGoogleSignup, safeNext, type GoogleSignup } from "@/lib/google-auth";
import { LEGAL_VERSION } from "@/lib/plans";
import { requestMeta } from "@/lib/request";
import { homePath } from "@/lib/roles";
import { createSession } from "@/lib/session";
import { firstError, GoogleParentSchema, GoogleStudentSchema, keepValues, type FormState } from "@/lib/validation";

async function pendingSignup(): Promise<GoogleSignup> {
  const jar = await cookies();
  const signup = await readGoogleSignup(jar.get(GOOGLE_SIGNUP_COOKIE)?.value);
  if (!signup) redirect("/login?error=google");
  return signup;
}

async function emailTaken(email: string, sub: string) {
  const row = await prisma.user.findFirst({
    where: { OR: [{ email }, { login: email }, { googleSub: sub }] },
    select: { id: true },
  });
  return !!row;
}

async function finish(userId: string, role: "parent" | "student", next: string | null) {
  const jar = await cookies();
  jar.delete(GOOGLE_SIGNUP_COOKIE);
  await createSession(userId, role);
  redirect(safeNext(next) ?? `${homePath(role)}${role === "parent" ? "?welcome=1" : ""}`);
}

const TAKEN = "Акаунт з таким email уже існує. Спробуйте увійти.";

export async function completeGoogleParent(_prev: FormState, formData: FormData): Promise<FormState> {
  const signup = await pendingSignup();
  const parsed = GoogleParentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error), values: keepValues(formData) };
  if (await emailTaken(signup.email, signup.sub)) return { error: TAKEN, values: keepValues(formData) };

  const meta = await requestMeta();
  const user = await prisma.$transaction((tx) =>
    tx.user.create({
      data: {
        role: "parent",
        login: signup.email,
        email: signup.email,
        name: parsed.data.name,
        googleSub: signup.sub,
        passwordHash: null,
        consents: { create: { type: "age_confirm", documentVersion: LEGAL_VERSION, ...meta } },
      },
    }),
  );
  await finish(user.id, "parent", signup.next);
}

export async function completeGoogleStudent(_prev: FormState, formData: FormData): Promise<FormState> {
  const signup = await pendingSignup();
  const parsed = GoogleStudentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error), values: keepValues(formData) };
  if (await emailTaken(signup.email, signup.sub)) return { error: TAKEN, values: keepValues(formData) };

  const user = await prisma.user.create({
    data: {
      role: "student",
      login: signup.email,
      email: signup.email,
      name: parsed.data.name,
      birthYear: parsed.data.birthYear,
      googleSub: signup.sub,
      passwordHash: null,
    },
  });
  await finish(user.id, "student", signup.next);
}
