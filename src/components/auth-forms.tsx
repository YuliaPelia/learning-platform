"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, registerParent } from "@/actions/auth";

function ErrorBox({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-danger">
      {message}
    </p>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(registerParent, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label htmlFor="name" className="label">Ваше ім’я</label>
        <input id="name" name="name" className="field" autoComplete="name" required defaultValue={state?.values?.name} />
      </div>
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" className="field" autoComplete="email" required defaultValue={state?.values?.email} />
      </div>
      <div>
        <label htmlFor="password" className="label">Пароль</label>
        <input id="password" name="password" type="password" className="field" autoComplete="new-password" minLength={8} required />
        <p className="mt-1.5 text-sm text-faint">Щонайменше 8 символів, літери й цифри</p>
      </div>
      <label className="flex cursor-pointer items-start gap-3 leading-relaxed text-soft">
        <input type="checkbox" name="ageConfirm" className="mt-1 h-5 w-5 shrink-0 accent-accent" required defaultChecked={state?.values?.ageConfirm === "on"} />
        <span>
          Мені виповнилося 18 років, я батько, мати або опікун дитини. Я ознайомився(-лась) з{" "}
          <Link href="/legal/privacy" target="_blank" className="text-accent underline">Політикою конфіденційності</Link> та{" "}
          <Link href="/legal/terms" target="_blank" className="text-accent underline">Правилами користування</Link>.
        </span>
      </label>
      <ErrorBox message={state?.error} />
      <button type="submit" disabled={pending} className="btn-primary h-13 text-lg">
        {pending ? "Створюємо…" : "Створити акаунт"}
      </button>
    </form>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label htmlFor="login" className="label">Email (батьки) або логін (дитина)</label>
        <input id="login" name="login" className="field" autoComplete="username" required defaultValue={state?.values?.login} />
      </div>
      <div>
        <label htmlFor="password" className="label">Пароль</label>
        <input id="password" name="password" type="password" className="field" autoComplete="current-password" required />
      </div>
      <ErrorBox message={state?.error} />
      <button type="submit" disabled={pending} className="btn-primary h-13 text-lg">
        {pending ? "Входимо…" : "Увійти"}
      </button>
    </form>
  );
}
