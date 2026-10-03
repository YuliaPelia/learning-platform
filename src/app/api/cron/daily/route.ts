/**
 * Щоденна задача (запускається планувальником, напр. Vercel Cron — див. vercel.json):
 * 1) нагадування батькам за 3 дні до списання;
 * 2) нагадування про домашку, у якої дедлайн завтра;
 * 3) підписки, у яких минув пільговий період, переводимо в "скасована".
 */
import { prisma } from "@/db";
import { formatDate, formatUah } from "@/lib/format";
import { appUrl, sendEmail } from "@/lib/mailer";
import { GRACE_DAYS } from "@/lib/plans";

const DAY = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const now = new Date();
  const report = { billingReminders: 0, homeworkReminders: 0, expired: 0 };

  // 1. За 3 дні до списання
  const soon = await prisma.subscription.findMany({
    where: { status: "active", endsAt: { gt: now, lte: new Date(now.getTime() + 3 * DAY) } },
    include: { user: { select: { email: true } }, plan: { select: { name: true } } },
  });
  for (const sub of soon) {
    if (sub.remindedForPeriodEnd?.getTime() === sub.endsAt?.getTime()) continue;
    await sendEmail(
      sub.user.email,
      "Нагадування: скоро щомісячне списання",
      `${formatDate(sub.endsAt)} буде списано ${formatUah(sub.amount)} за тариф «${sub.plan.name}».\n` +
        `Скасувати можна будь-коли в кабінеті: ${appUrl("/cabinet/parent")}\n\nКоманда ITCodeCraft`,
    );
    await prisma.subscription.update({ where: { id: sub.id }, data: { remindedForPeriodEnd: sub.endsAt } });
    report.billingReminders++;
  }

  // 2. Домашка з дедлайном протягом доби
  const due = await prisma.submission.findMany({
    where: { status: "pending", remindedAt: null, dueAt: { gt: now, lte: new Date(now.getTime() + DAY) } },
    include: {
      user: { select: { name: true, parent: { select: { email: true } } } },
      homework: { select: { lesson: { select: { title: true } } } },
    },
  });
  for (const s of due) {
    if (!s.user.parent) continue;
    await sendEmail(
      s.user.parent.email,
      `${s.user.name}: завтра дедлайн домашки`,
      `Домашнє завдання до уроку «${s.homework.lesson.title}» треба здати до ${formatDate(s.dueAt)}\nКабінет: ${appUrl("/cabinet/parent")}`,
    );
    await prisma.submission.update({ where: { id: s.id }, data: { remindedAt: now } });
    report.homeworkReminders++;
  }

  // 3. Прострочені підписки після пільгового періоду
  const expired = await prisma.subscription.updateMany({
    where: { status: { in: ["past_due", "active"] }, endsAt: { lt: new Date(now.getTime() - GRACE_DAYS * DAY) } },
    data: { status: "canceled", canceledAt: now },
  });
  report.expired = expired.count;

  return Response.json(report);
}
