"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { completeGoogleParent, completeGoogleStudent } from "@/actions/google-signup";

function ErrorBox({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-danger">
      {message}
    </p>
  );
}

export function GoogleRoleForm({ email, defaultName }: { email: string; defaultName: string }) {
  const [who, setWho] = useState<"parent" | "student">("parent");
  const [parentState, parentAction, parentPending] = useActionState(completeGoogleParent, undefined);
  const [studentState, studentAction, studentPending] = useActionState(completeGoogleStudent, undefined);
  const year = new Date().getFullYear();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2" role="group" aria-label="Хто ви">
        <button
          type="button"
          aria-pressed={who === "parent"}
          onClick={() => setWho("parent")}
          className={who === "parent" ? "btn-primary h-11 flex-1" : "btn-ghost h-11 flex-1"}
        >
          Батьки
        </button>
        <button
          type="button"
          aria-pressed={who === "student"}
          onClick={() => setWho("student")}
          className={who === "student" ? "btn-primary h-11 flex-1" : "btn-ghost h-11 flex-1"}
        >
          Дитина
        </button>
      </div>

      {who === "parent" ? (
        <form action={parentAction} className="flex flex-col gap-4">
          <div>
            <label htmlFor="parent-name" className="label">Ваше ім’я</label>
            <input id="parent-name" name="name" className="field" autoComplete="name" required defaultValue={parentState?.values?.name ?? defaultName} />
          </div>
          <label className="flex cursor-pointer items-start gap-3 leading-relaxed text-soft">
            <input type="checkbox" name="ageConfirm" className="mt-1 h-5 w-5 shrink-0 accent-accent" required defaultChecked={parentState?.values?.ageConfirm === "on"} />
            <span>
              Мені виповнилося 18 років, я батько, мати або опікун дитини. Я ознайомився(-лась) з{" "}
              <Link href="/legal/privacy" target="_blank" className="text-accent underline">Політикою конфіденційності</Link> та{" "}
              <Link href="/legal/terms" target="_blank" className="text-accent underline">Правилами користування</Link>.
            </span>
          </label>
          <ErrorBox message={parentState?.error} />
          <button type="submit" disabled={parentPending} className="btn-primary h-13 text-lg">
            {parentPending ? "Створюємо…" : "Створити акаунт батьків"}
          </button>
        </form>
      ) : (
        <form action={studentAction} className="flex flex-col gap-4">
          <div>
            <label htmlFor="student-name" className="label">Ім’я або нікнейм</label>
            <input id="student-name" name="name" className="field" required maxLength={40} defaultValue={studentState?.values?.name ?? defaultName} />
          </div>
          <div>
            <label htmlFor="student-year" className="label">Рік народження</label>
            <input id="student-year" name="birthYear" type="number" min={year - 18} max={year - 8} className="field" required defaultValue={studentState?.values?.birthYear} />
          </div>
          <ErrorBox message={studentState?.error} />
          <button type="submit" disabled={studentPending} className="btn-primary h-13 text-lg">
            {studentPending ? "Створюємо…" : "Створити профіль дитини"}
          </button>
        </form>
      )}
      <p className="text-sm text-muted">Вхід для {email}. Викладача й адміністратора тут створити не можна.</p>
    </div>
  );
}
