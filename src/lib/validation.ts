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
  login: z.string().trim().toLowerCase().min(2, { error: "Вкажіть email або логін" })
    .max(100, { error: "Логін занадто довгий" }),
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
  email: z
    .union([z.literal(""), z.email({ error: "Некоректний email" }).trim().toLowerCase()])
    .optional()
    .transform((v) => v || undefined),
  childDataConsent: z.literal("on", { error: "Потрібна ваша згода на обробку даних дитини" }),
});

export const GoogleParentSchema = z.object({
  name: z.string().trim().min(2, { error: "Вкажіть ім'я" }).max(60),
  ageConfirm: z.literal("on", { error: "Потрібно підтвердити, що вам є 18 років" }),
});

/**
 * Самостійно (без батьків) зареєструватися може лише учень від 14 років — так обіцяє політика
 * конфіденційності: дані дітей до 14 років ми отримуємо лише від батьків, разом з їхньою згодою.
 * Відомий лише рік народження, тож межа консервативна: точно виповнилося 14.
 */
export const MIN_SELF_SIGNUP_AGE = 14;
export const SELF_SIGNUP_TOO_YOUNG = "Самостійно зареєструватися можна з 14 років. Попроси батьків створити тобі профіль у їхньому кабінеті — і входь за логіном від них.";

export const GoogleStudentSchema = z.object({
  name: z.string().trim().min(2, { error: "Вкажіть ім'я або нікнейм" }).max(40),
  birthYear: z.coerce
    .number({ error: "Вкажіть рік народження" })
    .int()
    .min(currentYear - 18, { error: "Платформа для дітей 9–17 років" })
    .max(currentYear - MIN_SELF_SIGNUP_AGE - 1, { error: SELF_SIGNUP_TOO_YOUNG }),
});

export const CheckoutSchema = z.object({
  plan: z.enum(["basic", "standard", "premium"]),
  studentId: z.uuid({ error: "Оберіть дитину" }),
  courseId: z.string().optional(),
  consentOffer: z.literal("on", { error: "Потрібно прийняти умови оферти" }),
  consentImmediate: z.literal("on", { error: "Потрібна згода на негайний доступ до уроків" }),
});

export const CancelSubscriptionSchema = z.object({ subscriptionId: z.uuid() });

export const CourseSchema = z
  .object({
    title: z.string().trim().min(2, { error: "Вкажіть назву курсу" }).max(80),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { error: "Адреса курсу: латинські літери, цифри й дефіси, напр. python-start" })
      .max(40),
    description: z.string().trim().max(500),
    category: z.enum(["start", "web", "design", "code", "mobile", "games"]),
    ageFrom: z.coerce.number({ error: "Вкажіть вік" }).int().min(5).max(18),
    ageTo: z.coerce.number({ error: "Вкажіть вік" }).int().min(5).max(18),
    status: z.enum(["published", "soon"]),
    minPlan: z.enum(["basic", "standard", "premium"]),
    sortOrder: z.coerce.number().int().min(0).max(9999),
  })
  .refine((c) => c.ageFrom <= c.ageTo, { error: "Вік «від» не може бути більшим за вік «до»" });

const QuizQuestionSchema = z.object({
  q: z.string().trim().min(1, { error: "У кожного питання має бути текст" }).max(500),
  options: z
    .array(z.string().trim().min(1, { error: "Варіант відповіді не може бути порожнім" }).max(300))
    .min(2, { error: "У питання має бути щонайменше 2 варіанти відповіді" })
    .max(8),
  answer: z.number().int().min(0),
});

export const QuizQuestionsSchema = z
  .array(QuizQuestionSchema.refine((q) => q.answer < q.options.length, { error: "Позначте правильну відповідь у кожному питанні" }))
  .min(1, { error: "Додайте до тесту хоча б одне питання" })
  .max(50);

export const LessonSchema = z.object({
  type: z.enum(["video", "text", "quiz"]),
  title: z.string().trim().min(2, { error: "Вкажіть назву уроку" }).max(120),
  summary: z.string().trim().max(200),
  xp: z.coerce.number({ error: "Вкажіть XP" }).int().min(0).max(1000),
  videoUrl: z.string().trim().max(500),
  markdown: z.string().max(50000),
  homeworkTask: z.string().trim().max(5000),
  maxScore: z.coerce.number().int().min(1).max(100),
  dueDays: z.coerce.number().int().min(1).max(60),
});

/** Відеоурок, який додають викладач або адмін: тип зафіксовано — video. */
export const VideoLessonSchema = z.object({
  courseId: z.uuid({ error: "Оберіть курс" }),
  title: z.string().trim().min(2, { error: "Вкажіть назву уроку" }).max(120),
  summary: z.string().trim().max(200),
  xp: z.coerce.number({ error: "Вкажіть XP" }).int().min(0).max(1000),
  videoUrl: z.string().trim().min(1, { error: "Вкажіть посилання на відео" }).max(500),
  markdown: z.string().max(50000),
});

/** Перевірка роботи викладачем. Оцінка й коментар не відхиляються, а нормалізуються (клемпінг до maxScore — в action). */
export const ReviewHomeworkSchema = z.object({
  homeworkId: z.uuid(),
  // Нечисловий/відсутній score => 0
  score: z.coerce.number().catch(0),
  // Обрізаємо до 2000 символів; порожній => null
  comment: z
    .string()
    .catch("")
    .transform((s) => s.trim().slice(0, 2000) || null),
});

/** Повідомлення в гілці домашки: непорожнє, до 2000 символів (довше — відхиляємо, а не обрізаємо). */
export const SendMessageSchema = z.object({
  submissionId: z.uuid(),
  body: z.string().trim().min(1).max(2000),
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

/** Ідентифікатор ресурсу з прихованого поля форми адмінки (курс або урок). */
export const AdminIdSchema = z.uuid();

/** Здача домашки учнем: id роботи + текст відповіді (обрізається до 10000 символів, порожній — помилка). */
export const SubmitHomeworkSchema = z.object({
  homeworkId: z.uuid(),
  answer: z
    .string()
    .transform((s) => s.trim().slice(0, 10000))
    .pipe(z.string().min(1)),
});

/** Ідентифікатор уроку з прихованого поля форми учня (колонка @db.Uuid: не-UUID дав би помилку Prisma). */
export const LessonIdSchema = z.uuid();

/** Ідентифікатор дитини з прихованого поля форми батька (колонка @db.Uuid: не-UUID дав би помилку Prisma P2023). */
export const ChildIdSchema = z.uuid();
