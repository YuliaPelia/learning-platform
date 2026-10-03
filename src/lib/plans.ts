/**
 * Тарифи. Назва і ціна живуть у базі (таблиця plans) — їх можна змінити без деплою.
 * Тут — те, що тариф ДАЄ: ці правила використовує код (доступ, бейджі, викладач).
 */
import type { PlanCode } from "@/generated/prisma/enums";

export type PlanId = PlanCode;

export type PlanFeatures = {
  id: PlanId;
  description: string;
  allCourses: boolean; // Преміум — усі курси
  support: boolean; // чат підтримки
  badges: boolean; // XP-рівні, бейджі, сертифікат
  teacher: boolean; // викладач перевіряє домашки
  popular?: boolean;
};

/** Тариф для показу: можливості + назва й ціна з бази. */
export type Plan = PlanFeatures & {
  name: string;
  price: number; // грн на місяць
};

export const PLANS: Record<PlanId, PlanFeatures> = {
  basic: {
    id: "basic",
    description: "Один курс для самостійного навчання",
    allCourses: false,
    support: false,
    badges: false,
    teacher: false,
  },
  standard: {
    id: "standard",
    description: "Один курс з підтримкою та ігровою мотивацією",
    allCourses: false,
    support: true,
    badges: true,
    teacher: false,
    popular: true,
  },
  premium: {
    id: "premium",
    description: "Усі курси та особистий викладач",
    allCourses: true,
    support: true,
    badges: true,
    teacher: true,
  },
};

/** Порядок тарифів (збігається з plans.rank у базі): чим більше, тим ширший доступ. */
export const PLAN_RANK: Record<PlanId, number> = { basic: 1, standard: 2, premium: 3 };

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
