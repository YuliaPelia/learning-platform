/**
 * returnUrl — сюди WayForPay повертає батьків після оплати (методом POST).
 * Сторінка не може прийняти POST, тому просто перенаправляємо в кабінет.
 * Доступ відкриває НЕ цей запит, а callback (serviceUrl) з перевіреним підписом.
 */
import { appUrl } from "@/lib/mailer";

function back() {
  return Response.redirect(appUrl("/cabinet/parent?payment=return"), 303);
}

export const POST = back;
export const GET = back;
