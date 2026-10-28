import "server-only";
import { prisma } from "@/db";
import { Prisma } from "@/generated/prisma/client";
import { getWfpConfig, removeRegularPayment } from "@/lib/wayforpay";

export type DeleteResult = { ok: true } | { ok: false; error: string };

const wfpError = (canceledBefore: number) =>
  "Не вдалося скасувати підписку в платіжній системі, тож акаунт не видалено" +
  (canceledBefore ? ` (${canceledBefore} інших підписок уже скасовано)` : "") +
  ". Спробуйте пізніше або напишіть на itcodecraft@gmail.com.";

/**
 * Зупиняє регулярні списання й позначає підписки скасованими — і діючі, і незавершені (pending):
 * інакше оплата, завершена вже після видалення, активувала б підписку.
 * Повертає null, якщо все скасовано, або повідомлення про помилку: WayForPay не підтвердив зупинку,
 * тож нічого не видаляємо, щоб не списувати гроші за видалений акаунт.
 */
async function cancelSubscriptions(where: Prisma.SubscriptionWhereInput): Promise<string | null> {
  const subs = await prisma.subscription.findMany({ where: { ...where, status: { in: ["active", "past_due", "pending"] } } });
  const cfg = getWfpConfig();
  let canceled = 0;
  for (const s of subs) {
    // У незавершеної оплати ще немає регулярного платежу — у WayForPay зупиняти нічого
    if (cfg && s.status !== "pending") {
      const ok = await removeRegularPayment(cfg, s.orderReference).catch(() => false);
      if (!ok) {
        console.error("Не вдалося скасувати регулярний платіж — видалення зупинено", s.orderReference);
        return wfpError(canceled);
      }
    }
    await prisma.subscription.update({ where: { id: s.id }, data: { status: "canceled", canceledAt: new Date() } });
    canceled++;
  }
  return null;
}

/**
 * Профіль учня видаляється повністю: прогрес, домашки, листування й сесії — каскадно.
 * Платежі й згоди лишаються для обліку, але більше не пов'язані з дитиною.
 */
export async function deleteStudentProfile(studentId: string): Promise<DeleteResult> {
  const error = await cancelSubscriptions({ studentId });
  if (error) return { ok: false, error };
  await prisma.user.delete({ where: { id: studentId } });
  return { ok: true };
}

/**
 * Видалення власного акаунта (право на видалення; вимога App Store і Google Play).
 *  - учень, що зареєструвався сам, — видаляється повністю;
 *  - учня, створеного батьками, видаляють батьки (його дані — під їхньою згодою);
 *  - батьки: скасовуються всі списання, профілі дітей видаляються, а сам акаунт знеособлюється —
 *    до нього прив'язані платежі й згоди, які треба зберігати для обліку. Лишаються: сума, дата й номер
 *    замовлення платежів; дата, версія документа, IP і браузер у записах згод.
 */
export async function deleteAccount(user: { id: string; role: string; parentId: string | null }): Promise<DeleteResult> {
  if (user.role === "student") {
    if (user.parentId) {
      return { ok: false, error: "Твій профіль створили батьки — попроси їх видалити його у своєму кабінеті." };
    }
    return deleteStudentProfile(user.id);
  }
  if (user.role !== "parent") return { ok: false, error: "Цей акаунт видаляє адміністратор платформи." };

  const error = await cancelSubscriptions({ OR: [{ userId: user.id }, { student: { parentId: user.id } }] });
  if (error) return { ok: false, error };
  await prisma.$transaction([
    prisma.user.deleteMany({ where: { parentId: user.id } }),
    // Для обліку лишаються сума, дата й номер замовлення; сирий callback платіжки (email, телефон,
    // маска картки) і токен регулярних списань стираємо
    prisma.payment.updateMany({ where: { subscription: { userId: user.id } }, data: { raw: Prisma.DbNull } }),
    prisma.subscription.updateMany({ where: { userId: user.id }, data: { recToken: null } }),
    prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        name: "Видалений акаунт",
        email: null,
        login: `deleted-${user.id}`,
        passwordHash: null,
        googleSub: null,
        appleSub: null,
        birthYear: null,
        deletedAt: new Date(),
      },
    }),
  ]);
  return { ok: true };
}
