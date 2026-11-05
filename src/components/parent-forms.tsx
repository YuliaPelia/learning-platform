"use client";

import { useActionState, useEffect, useRef } from "react";
import { cancelSubscription } from "@/actions/checkout";
import { changeChildPassword, deleteChild } from "@/actions/children";
import { PasswordInput } from "@/components/password-input";

/** Скасування підписки: помилку WayForPay показуємо батькам, а не ковтаємо мовчки. */
export function CancelSubscriptionForm({ subscriptionId }: { subscriptionId: string }) {
  const [state, action, pending] = useActionState(cancelSubscription, undefined);
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="subscriptionId" value={subscriptionId} />
      <button className="btn-ghost h-10" disabled={pending}>Скасувати</button>
      {state?.error && <p role="alert" className="max-w-xs text-sm text-danger">{state.error}</p>}
    </form>
  );
}

/** Новий пароль для дитини; введене можна переглянути, щоб не помилитися. */
export function ChildPasswordForm({ childId, login }: { childId: string; login: string }) {
  const [state, action, pending] = useActionState(changeChildPassword, undefined);
  const id = `child-pass-${childId}`;
  const formRef = useRef<HTMLFormElement>(null);
  // Після збереження поле очищаємо, щоб пароль не лишався на екрані
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="childId" value={childId} />
      <p className="text-sm text-muted">
        Логін для входу: <b className="font-mono text-text">{login}</b>. Старий пароль переглянути неможливо — він зберігається
        зашифрованим. Задайте новий і повідомте його дитині.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <label htmlFor={id} className="label">Новий пароль</label>
          <PasswordInput id={id} name="password" required minLength={8} autoComplete="new-password" />
        </div>
        <button className="btn-primary h-12" disabled={pending}>{pending ? "Зберігаємо…" : "Зберегти пароль"}</button>
      </div>
      <p className="text-sm text-faint">Щонайменше 8 символів, літери й цифри</p>
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm font-semibold text-good">Пароль змінено ✔ Дитина входить з новим паролем.</p>}
    </form>
  );
}

export function DeleteChildForm({ childId }: { childId: string }) {
  const [state, action, pending] = useActionState(deleteChild, undefined);
  return (
    <form action={action} className="mt-3 flex flex-col gap-2">
      <input type="hidden" name="childId" value={childId} />
      <span className="text-sm text-muted">Точно видалити? Прогрес і домашки буде втрачено.</span>
      <button className="btn h-10 bg-danger/15 text-danger hover:bg-danger/25" disabled={pending}>Так, видалити назавжди</button>
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
