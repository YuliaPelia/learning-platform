import "server-only";
import { prisma } from "@/db";
import type { Prisma } from "@/generated/prisma/client";
import { getWfpConfig, removeRegularPayment } from "@/lib/wayforpay";

export type DeleteResult = { ok: true } | { ok: false; error: string };

const WFP_ERROR =
  "Не вдалося скасувати підписку в платіжній системі, тож нічого не видалено. Спробуйте пізніше або напишіть на itcodecraft@gmail.com.";

/**
 * Зупиняє діючі регулярні списання й позначає підписки скасованими.
 * false — WayForPay не підтвердив зупинку: тоді нічого не видаляємо, щоб не списувати гроші за видалений акаунт.
 */
async function cancelLiveSubscriptions(where: Prisma.SubscriptionWhereInput): Promise<boolean> {
  const subs = await prisma.subscription.findMany({ where: { ...where, status: { in: ["active", "past_due"] } } });
  const cfg = getWfpConfig();
  for (const s of subs) {
    if (cfg) {
      const ok = await removeRegularPayment(cfg, s.orderReference).catch(() => false);
      if (!ok) {
        console.error("Не вдалося скасувати регулярний платіж — видалення зупинено", s.orderReference);
        return false;
      }
    }
    await prisma.subscription.update({ where: { id: s.id }, data: { status: "canceled", canceledAt: new Date() } });
  }
  return true;
}

/**
 * Профіль учня видаляється повністю: прогрес, домашки, листування й сесії — каскадно.
 * Платежі й згоди лишаються для обліку, але більше не пов'язані з дитиною.
 */
export async function deleteStudentProfile(studentId: string): Promise<DeleteResult> {
  if (!(await cancelLiveSubscriptions({ studentId }))) return { ok: false, error: WFP_ERROR };
  await prisma.user.delete({ where: { id: studentId } });
  return { ok: true };
}

/**
 * Видалення власного акаунта (право на видалення; вимога App Store і Google Play).
 *  - учень, що зареєструвався сам, — видаляється повністю;
 *  - учня, створеного батьками, видаляють батьки (його дані — під їхньою згодою);
 *  - батьки: скасовуються всі списання, профілі дітей видаляються, а сам акаунт знеособлюється —
 *    до нього прив'язані платежі й згоди, які треба зберігати, тож рядок лишається без персональних даних.
 */
export async function deleteAccount(user: { id: string; role: string; parentId: string | null }): Promise<DeleteResult> {
  if (user.role === "student") {
    if (user.parentId) {
      return { ok: false, error: "Твій профіль створили батьки — попроси їх видалити його у своєму кабінеті." };
    }
    return deleteStudentProfile(user.id);
  }
  if (user.role !== "parent") return { ok: false, error: "Цей акаунт видаляє адміністратор платформи." };

  if (!(await cancelLiveSubscriptions({ OR: [{ userId: user.id }, { student: { parentId: user.id } }] }))) {
    return { ok: false, error: WFP_ERROR };
  }
  await prisma.$transaction([
    prisma.user.deleteMany({ where: { parentId: user.id } }),
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
