"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, registerParent } from "@/actions/auth";
import { confirmPasswordReset, sendResetCode } from "@/actions/password-reset";
import { IconGoogle } from "@/components/icons";

export function GoogleButton({ next }: { next?: string }) {
  const href = next ? `/api/auth/google?next=${encodeURIComponent(next)}` : "/api/auth/google";
  return (
    <a href={href} className="btn-ghost h-13 w-full gap-3 text-lg">
      <IconGoogle size={22} /> Увійти через Google
    </a>
  );
}

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
        <Link href="/forgot-password" className="mt-2 inline-block text-sm font-semibold text-accent hover:underline">Забули пароль?</Link>
      </div>
      <ErrorBox message={state?.error} />
      <button type="submit" disabled={pending} className="btn-primary h-13 text-lg">
        {pending ? "Входимо…" : "Увійти"}
      </button>
    </form>
  );
}

/** Відновлення пароля: 1) пошта → код у листі; 2) код + новий пароль → одразу вхід. */
export function ForgotPasswordForm() {
  const [sent, sendAction, sending] = useActionState(sendResetCode, undefined);
  const [reset, resetAction, resetting] = useActionState(confirmPasswordReset, undefined);
  const email = sent?.ok ? sent.values?.email : undefined;

  if (!email) {
    return (
      <form action={sendAction} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="label">Email акаунта</label>
          <input id="email" name="email" type="email" className="field" autoComplete="email" required defaultValue={sent?.values?.email} />
        </div>
        <ErrorBox message={sent?.error} />
        <button type="submit" disabled={sending} className="btn-primary h-13 text-lg">
          {sending ? "Надсилаємо…" : "Надіслати код"}
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p role="status" className="rounded-xl bg-good/10 px-4 py-3 text-good">
        Якщо акаунт з поштою <b>{email}</b> існує, ми надіслали на неї код. Перевірте також «Спам».
      </p>
      <form action={resetAction} className="flex flex-col gap-4">
        <input type="hidden" name="email" value={email} />
        <div>
          <label htmlFor="code" className="label">Код із листа</label>
          <input
            id="code"
            name="code"
            className="field font-mono tracking-[0.3em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            defaultValue={reset?.values?.code}
          />
        </div>
        <div>
          <label htmlFor="password" className="label">Новий пароль</label>
          <input id="password" name="password" type="password" className="field" autoComplete="new-password" minLength={8} required />
          <p className="mt-1.5 text-sm text-faint">Щонайменше 8 символів, літери й цифри</p>
        </div>
        <div>
          <label htmlFor="passwordRepeat" className="label">Повторіть пароль</label>
          <input id="passwordRepeat" name="passwordRepeat" type="password" className="field" autoComplete="new-password" minLength={8} required />
        </div>
        <ErrorBox message={reset?.error ?? sent?.error} />
        <button type="submit" disabled={resetting} className="btn-primary h-13 text-lg">
          {resetting ? "Зберігаємо…" : "Змінити пароль і увійти"}
        </button>
      </form>
      <form action={sendAction} className="text-center">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="step" value="code" />
        <button type="submit" disabled={sending} className="text-sm font-semibold text-accent hover:underline disabled:opacity-60">
          {sending ? "Надсилаємо…" : "Надіслати код ще раз"}
        </button>
      </form>
    </div>
  );
}
