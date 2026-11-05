"use client";

import { useState, type ComponentProps } from "react";
import { IconEye, IconEyeOff } from "@/components/icons";

/** Поле пароля з кнопкою «показати / сховати» — щоб перевірити, що введено саме те, що задумано. */
export function PasswordInput({ className = "", ...props }: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={`field pr-12 ${className}`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Сховати пароль" : "Показати пароль"}
        aria-pressed={visible}
        aria-controls={props.id}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-2xl text-muted hover:text-accent focus-visible:text-accent focus-visible:outline-none"
      >
        {visible ? <IconEyeOff /> : <IconEye />}
      </button>
    </div>
  );
}
