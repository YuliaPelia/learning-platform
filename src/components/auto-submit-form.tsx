"use client";

import { useEffect, useRef } from "react";

/** Форма, яка сама відправляється на сторінку оплати WayForPay. */
export function AutoSubmitForm({ action, fields }: { action: string; fields: Array<[string, string]> }) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    ref.current?.submit();
  }, []);
  return (
    <form ref={ref} method="POST" action={action} acceptCharset="utf-8">
      {fields.map(([name, value], i) => (
        <input key={`${name}-${i}`} type="hidden" name={name} value={value} />
      ))}
      <noscript>Увімкніть JavaScript або натисніть кнопку нижче.</noscript>
      <button type="submit" className="btn-primary">Перейти до оплати</button>
    </form>
  );
}
