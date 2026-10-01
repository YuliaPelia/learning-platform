/**
 * Тарифи — ЄДИНЕ місце, де описано ціни й можливості.
 * Сторінка тарифів, оплата і перевірка доступу беруть дані звідси,
 * тож щоб змінити ціну, достатньо змінити одне число.
 */
export type PlanId = "basic" | "standard" | "premium";

export type Plan = {
  id: PlanId;
  name: string;
  price: number; // грн на місяць
  description: string;
  allCourses: boolean; // Преміум — усі курси
  support: boolean; // чат підтримки
  badges: boolean; // XP-рівні, бейджі, сертифікат
  teacher: boolean; // викладач перевіряє домашки
  popular?: boolean;
};

export const PLANS: Record<PlanId, Plan> = {
  basic: {
    id: "basic",
    name: "Простий",
    price: 249,
    description: "Один курс для самостійного навчання",
    allCourses: false,
    support: false,
    badges: false,
    teacher: false,
  },
  standard: {
    id: "standard",
    name: "Середній",
    price: 449,
    description: "Один курс з підтримкою та ігровою мотивацією",
    allCourses: false,
    support: true,
    badges: true,
    teacher: false,
    popular: true,
  },
  premium: {
    id: "premium",
    name: "Преміум",
    price: 899,
    description: "Усі курси та особистий викладач",
    allCourses: true,
    support: true,
    badges: true,
    teacher: true,
  },
};

export const PLAN_LIST: Plan[] = [PLANS.basic, PLANS.standard, PLANS.premium];

/** Скільки перших уроків кожного курсу доступні безкоштовно. */
export const FREE_LESSONS = 2;

/** Пільговий період після невдалого списання, днів. */
export const GRACE_DAYS = 3;

/** Рядки порівняльної таблиці тарифів: [текст, basic, standard, premium]. */
export const PLAN_FEATURES: Array<[string, boolean, boolean, boolean]> = [
  ["Уроки крок за кроком, тести й домашки", true, true, true],
  ["Нагадування про домашки", true, true, true],
  ["Чат підтримки", false, true, true],
  ["XP, рівні, бейджі та сертифікат", false, true, true],
  ["Викладач перевіряє домашки з коментарем", false, false, true],
  ["Онлайн-зустріч з викладачем 1 раз на місяць", false, false, true],
];

export function isPlanId(v: unknown): v is PlanId {
  return v === "basic" || v === "standard" || v === "premium";
}

/** Поточна версія юридичних документів — зберігається разом зі згодою. */
export const LEGAL_VERSION = "2026-09-28";
