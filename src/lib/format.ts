export function formatDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Kyiv" }).format(d);
}

export function formatShortDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "short", timeZone: "Europe/Kyiv" }).format(d);
}

export function formatDateTime(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Kyiv" }).format(d);
}

/** Українські відмінки: 1 день, 2 дні, 5 днів (правила з Intl.PluralRules). */
export function plural(n: number, forms: { one: string; few: string; many: string }) {
  const rule = new Intl.PluralRules("uk-UA").select(n);
  return `${n} ${rule === "one" ? forms.one : rule === "few" ? forms.few : forms.many}`;
}
export const pluralDays = (n: number) => plural(n, { one: "день", few: "дні", many: "днів" });

export const CATEGORY_LABELS: Record<string, string> = {
  start: "Ігри та перші кроки",
  web: "Веб-розробка",
  design: "Дизайн",
  code: "Програмування",
  mobile: "Мобільні застосунки",
  games: "Розробка ігор",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  pending: "Очікує оплату",
  active: "Активна",
  past_due: "Проблема з оплатою",
  canceled: "Скасована",
};

/** Суми в базі зберігаються в копійках: 44900 → "449 грн", 44950 → "449,50 грн". */
export function formatUah(kopecks: number) {
  return `${new Intl.NumberFormat("uk-UA", { minimumFractionDigits: kopecks % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(kopecks / 100)} грн`;
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "В обробці",
  approved: "Успішно",
  declined: "Відхилено",
  refunded: "Повернено",
};
