"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { addChild } from "@/actions/children";

export function AddChildForm() {
  const [state, action, pending] = useActionState(addChild, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);
  const year = new Date().getFullYear();

  return (
    <form ref={formRef} action={action} className="grid gap-4 md:grid-cols-2">
      <div>
        <label htmlFor="child-name" className="label">Ім’я або нікнейм дитини</label>
        <input id="child-name" name="name" className="field" required maxLength={40} defaultValue={state?.values?.name} />
      </div>
      <div>
        <label htmlFor="child-year" className="label">Рік народження</label>
        <input id="child-year" name="birthYear" type="number" min={year - 18} max={year - 8} className="field" required defaultValue={state?.values?.birthYear} />
      </div>
      <div>
        <label htmlFor="child-login" className="label">Логін для входу дитини</label>
        <input id="child-login" name="login" className="field" required pattern="[a-zA-Z0-9_.]{3,24}" autoComplete="off" defaultValue={state?.values?.login} />
        <p className="mt-1.5 text-sm text-faint">Латиницею, напр. maks_2014</p>
      </div>
      <div>
        <label htmlFor="child-password" className="label">Пароль дитини</label>
        <input id="child-password" name="password" type="password" className="field" required minLength={8} autoComplete="new-password" />
      </div>
      <div className="md:col-span-2">
        <label htmlFor="child-email" className="label">Email для входу через Google</label>
        <input id="child-email" name="email" type="email" className="field" autoComplete="off" defaultValue={state?.values?.email} />
        <p className="mt-1.5 text-sm text-faint">Необов’язково. Якщо вказати, дитина зможе натиснути «Увійти через Google».</p>
      </div>
      <label className="flex cursor-pointer items-start gap-3 leading-relaxed text-soft md:col-span-2">
        <input type="checkbox" name="childDataConsent" className="mt-1 h-5 w-5 shrink-0 accent-accent" required defaultChecked={state?.values?.childDataConsent === "on"} />
        <span>
          Я, як законний представник, даю згоду на обробку персональних даних моєї дитини (ім’я, рік народження, логін, прогрес навчання)
          відповідно до <Link href="/legal/privacy" target="_blank" className="text-accent underline">Політики конфіденційності</Link>.
        </span>
      </label>
      {state?.error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-danger md:col-span-2">{state.error}</p>
      )}
      {state?.ok && (
        <p role="status" className="rounded-xl bg-good/10 px-4 py-3 text-good md:col-span-2">
          Профіль створено! Дитина може увійти зі своїм логіном і паролем.
          {state.values?.email ? " З цією поштою вона також може натиснути «Увійти через Google»." : ""}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary md:col-span-2 md:justify-self-start">
        {pending ? "Створюємо…" : "Додати дитину"}
      </button>
    </form>
  );
}
