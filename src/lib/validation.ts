import * as z from "zod";

/** Схеми перевірки форм. Перевіряємо на сервері — браузеру довіряти не можна. */

const password = z
  .string()
  .min(8, { error: "Пароль — щонайменше 8 символів" })
  .regex(/[a-zA-Zа-яА-ЯіїєґІЇЄҐ]/, { error: "Пароль має містити хоча б одну літеру" })
  .regex(/[0-9]/, { error: "Пароль має містити хоча б одну цифру" });

export const RegisterSchema = z.object({
  name: z.string().trim().min(2, { error: "Вкажіть ім'я" }).max(60),
  email: z.email({ error: "Некоректний email" }).trim().toLowerCase(),
  password,
  ageConfirm: z.literal("on", { error: "Потрібно підтвердити, що вам є 18 років" }),
});

export const LoginSchema = z.object({
  login: z.string().trim().toLowerCase().min(2, { error: "Вкажіть email або логін" }),
  password: z.string().min(1, { error: "Вкажіть пароль" }),
});

const currentYear = new Date().getFullYear();

export const ChildSchema = z.object({
  name: z.string().trim().min(2, { error: "Вкажіть ім'я або нікнейм" }).max(40),
  birthYear: z.coerce
    .number({ error: "Вкажіть рік народження" })
    .int()
    .min(currentYear - 18, { error: "Платформа для дітей 9–17 років" })
    .max(currentYear - 8, { error: "Платформа для дітей 9–17 років" }),
  login: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_.]{3,24}$/, { error: "Логін: 3–24 латинські літери, цифри, _ або ." }),
  password,
  childDataConsent: z.literal("on", { error: "Потрібна ваша згода на обробку даних дитини" }),
});

export const CheckoutSchema = z.object({
  plan: z.enum(["basic", "standard", "premium"]),
  studentId: z.uuid({ error: "Оберіть дитину" }),
  courseId: z.string().optional(),
  consentOffer: z.literal("on", { error: "Потрібно прийняти умови оферти" }),
  consentImmediate: z.literal("on", { error: "Потрібна згода на негайний доступ до уроків" }),
});

export type FormState =
  | {
      error?: string;
      ok?: boolean;
      /** Введені значення (без паролів) — щоб після помилки форма не очищалась */
      values?: Record<string, string>;
    }
  | undefined;

/** Значення форми без паролів — повертаємо їх разом з помилкою. */
export function keepValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData) if (typeof v === "string" && !/password/i.test(k) && !k.startsWith("$")) out[k] = v;
  return out;
}

export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Перевірте дані форми";
}
