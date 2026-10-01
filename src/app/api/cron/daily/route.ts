/**
 * Щоденна задача (запускається планувальником, напр. Vercel Cron — див. vercel.json):
 * 1) нагадування батькам за 3 дні до списання;
 * 2) нагадування про домашку, у якої дедлайн завтра;
 * 3) підписки, у яких минув пільговий період, переводимо в "скасована".
 */
import { and, eq, gt, isNull, lt, lte, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatDate } from "@/lib/format";
import { appUrl, sendEmail } from "@/lib/mailer";
import { GRACE_DAYS, PLANS } from "@/lib/plans";

const DAY = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const now = new Date();
  const report = { billingReminders: 0, homeworkReminders: 0, expired: 0 };

  // 1. За 3 дні до списання
  const soon = await db
    .select({ sub: schema.subscriptions, parentEmail: schema.users.email })
    .from(schema.subscriptions)
    .innerJoin(schema.users, eq(schema.users.id, schema.subscriptions.parentId))
    .where(
      and(
        eq(schema.subscriptions.status, "active"),
        gt(schema.subscriptions.currentPeriodEnd, now),
        lte(schema.subscriptions.currentPeriodEnd, new Date(now.getTime() + 3 * DAY)),
      ),
    );
  for (const { sub, parentEmail } of soon) {
    if (sub.remindedForPeriodEnd?.getTime() === sub.currentPeriodEnd?.getTime()) continue;
    await sendEmail(
      parentEmail,
      "Нагадування: скоро щомісячне списання",
      `${formatDate(sub.currentPeriodEnd)} буде списано ${sub.amount} грн за тариф «${PLANS[sub.plan].name}».\n` +
        `Скасувати можна будь-коли в кабінеті: ${appUrl("/cabinet/parent")}\n\nКоманда ITCodeCraft`,
    );
    await db.update(schema.subscriptions).set({ remindedForPeriodEnd: sub.currentPeriodEnd }).where(eq(schema.subscriptions.id, sub.id));
    report.billingReminders++;
  }

  // 2. Домашка з дедлайном протягом доби
  const due = await db
    .select({ hw: schema.homework, childName: schema.users.name, parentId: schema.users.parentId, lessonTitle: schema.lessons.title })
    .from(schema.homework)
    .innerJoin(schema.users, eq(schema.users.id, schema.homework.studentId))
    .innerJoin(schema.lessons, eq(schema.lessons.id, schema.homework.lessonId))
    .where(
      and(
        eq(schema.homework.status, "pending"),
        isNull(schema.homework.remindedAt),
        gt(schema.homework.dueAt, now),
        lte(schema.homework.dueAt, new Date(now.getTime() + DAY)),
      ),
    );
  for (const { hw, childName, parentId, lessonTitle } of due) {
    if (!parentId) continue;
    const [parent] = await db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, parentId));
    await sendEmail(
      parent?.email,
      `${childName}: завтра дедлайн домашки`,
      `Домашнє завдання до уроку «${lessonTitle}» треба здати до ${formatDate(hw.dueAt)}\nКабінет: ${appUrl("/cabinet/parent")}`,
    );
    await db.update(schema.homework).set({ remindedAt: now }).where(eq(schema.homework.id, hw.id));
    report.homeworkReminders++;
  }

  // 3. Прострочені підписки після пільгового періоду
  const expired = await db
    .update(schema.subscriptions)
    .set({ status: "canceled", canceledAt: now })
    .where(
      and(
        or(eq(schema.subscriptions.status, "past_due"), eq(schema.subscriptions.status, "active")),
        lt(schema.subscriptions.currentPeriodEnd, new Date(now.getTime() - GRACE_DAYS * DAY)),
      ),
    )
    .returning({ id: schema.subscriptions.id });
  report.expired = expired.length;

  return Response.json(report);
}
