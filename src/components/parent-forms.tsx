"use client";

import { useActionState } from "react";
import { cancelSubscription } from "@/actions/checkout";
import { deleteChild } from "@/actions/children";

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
