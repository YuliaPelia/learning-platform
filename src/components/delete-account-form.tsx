"use client";

import { useActionState } from "react";
import { deleteMyAccount } from "@/actions/account";

/** Видалення власного акаунта: розкривається з <details>, вимагає позначки-підтвердження. */
export function DeleteAccountForm({ consequences }: { consequences: string }) {
  const [state, action, pending] = useActionState(deleteMyAccount, undefined);
  return (
    <details className="rounded-xl border border-danger/40 px-4 py-2">
      <summary className="cursor-pointer text-danger">Видалити мій акаунт</summary>
      <form action={action} className="mt-3 flex flex-col gap-3">
        <p className="text-sm leading-relaxed text-muted">{consequences}</p>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="confirm" className="mt-1" required />
          Розумію, що акаунт видаляється назавжди і цю дію не можна відмінити
        </label>
        <button className="btn h-10 self-start bg-danger/15 px-4 text-danger hover:bg-danger/25" disabled={pending}>
          {pending ? "Видаляємо…" : "Так, видалити акаунт"}
        </button>
        {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      </form>
    </details>
  );
}
