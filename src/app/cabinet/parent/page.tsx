import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/db";
import { cancelSubscription } from "@/actions/checkout";
import { deleteChild } from "@/actions/children";
import { AddChildForm } from "@/components/add-child-form";
import { CabinetShell, Notice, StatusBadge } from "@/components/cabinet-shell";
import { isSubscriptionLive } from "@/lib/access";
import { getChildren, requireUser } from "@/lib/dal";
import { PAYMENT_STATUS_LABELS, SUBSCRIPTION_STATUS_LABELS, formatDate, formatShortDate, formatUah } from "@/lib/format";
import { getStudentOverview, toAccessSub } from "@/lib/learning";
import { isStalePending } from "@/lib/billing";

export const metadata: Metadata = { title: "Кабінет батьків" };

const NAV = [
  { href: "/cabinet/parent", label: "Огляд" },
  { href: "/cabinet/parent#subscriptions", label: "Підписка й оплата" },
  { href: "/cabinet/parent#add-child", label: "Додати дитину" },
  { href: "/cabinet/parent#documents", label: "Документи й дані" },
  { href: "/pricing", label: "Тарифи" },
];

const CONSENT_LABELS: Record<string, string> = {
  age_confirm: "Підтвердження віку 18+ і статусу законного представника",
  child_data: "Згода на обробку даних дитини",
  offer: "Прийняття публічної оферти",
  immediate_access: "Згода на негайний доступ до цифрового контенту",
};

export default async function ParentCabinet({ searchParams }: PageProps<"/cabinet/parent">) {
  const parent = await requireUser("parent");
  const sp = await searchParams;
  const kids = await getChildren(parent.id);
  const overviews = await Promise.all(kids.map((k) => getStudentOverview(k.id)));

  const subs = await prisma.subscription.findMany({
    where: { userId: parent.id },
    include: { plan: true, course: { select: { title: true } }, student: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  // Незавершені замовлення старші за добу не показуємо — це просто закриті вкладки оплати
  const visibleSubs = subs.filter((s) => !isStalePending(s));

  const payments = await prisma.payment.findMany({
    where: { subscription: { userId: parent.id } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const consents = await prisma.consent.findMany({ where: { parentId: parent.id }, orderBy: { acceptedAt: "desc" } });
  const now = new Date();

  return (
    <CabinetShell nav={NAV} user={parent} roleLabel="Батьки">
      {sp.welcome && <Notice tone="success">Вітаємо в ITCodeCraft! Додайте профіль дитини нижче — і вона зможе почати з 2 безкоштовних уроків.</Notice>}
      {sp.payment === "done" && <Notice tone="success">Оплата пройшла — доступ відкрито. Чек і підтвердження надіслано на пошту.</Notice>}
      {sp.payment === "return" && (
        <Notice>Дякуємо! Щойно WayForPay підтвердить оплату (зазвичай за кілька секунд), статус підписки нижче оновиться. Оновіть сторінку.</Notice>
      )}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-3xl font-bold">Кабінет батьків</h1>
          <p className="text-[17px] text-muted">Прогрес, домашки та оплата — в одному місці</p>
        </div>
        <Link href="#add-child" className="btn-ghost">+ Додати дитину</Link>
      </div>

      {kids.length === 0 && (
        <Notice>Ще немає жодного профілю дитини. Створіть його — дитина входитиме за власним логіном.</Notice>
      )}

      {kids.map((kid, i) => {
        const o = overviews[i];
        const pendingHw = o.homework.filter((h) => h.status === "pending").length;
        return (
          <section key={kid.id} className="flex flex-col gap-5" aria-labelledby={`kid-${kid.id}`}>
            <h2 id={`kid-${kid.id}`} className="font-display text-2xl font-bold">
              {kid.name}
              {kid.birthYear ? <span className="ml-2 text-base font-normal text-muted">· {new Date().getFullYear() - kid.birthYear} років · логін {kid.login}</span> : null}
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Уроків за тиждень" value={String(o.lessonsThisWeek)} />
              <Stat label="Домашки здано" value={`${o.homework.length - pendingHw} з ${o.homework.length}`} />
              <Stat label="Рівень" value={`${o.level.level} · ${o.level.title}`} />
              <Stat label="Серія днів" value={String(o.streak)} />
            </div>
            <div className="card flex flex-col gap-3.5 px-8 py-7">
              <h3 className="text-[19px] font-bold">Домашки та коментарі викладача</h3>
              {o.homework.length === 0 && <p className="text-muted">Домашок поки немає.</p>}
              {o.homework.slice(0, 6).map((h) => (
                <div key={h.id} className="flex flex-col gap-2 rounded-2xl bg-ink px-4.5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold">
                      {h.courseTitle} · урок {h.lessonOrder}: {h.lessonTitle}
                    </span>
                    {h.status === "pending" ? (
                      <StatusBadge tone={h.dueAt && h.dueAt < now ? "bad" : "wait"}>
                        {h.dueAt && h.dueAt < now ? "Прострочено" : `До ${formatShortDate(h.dueAt)}`}
                      </StatusBadge>
                    ) : h.status === "submitted" ? (
                      <StatusBadge tone="wait">На перевірці</StatusBadge>
                    ) : (
                      <StatusBadge tone="good">{h.score != null ? `${h.score}/${h.maxScore}` : "Зараховано"}</StatusBadge>
                    )}
                  </div>
                  {h.teacherComment && <p className="text-sm leading-relaxed text-muted">Викладач: «{h.teacherComment}»</p>}
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <section id="subscriptions" className="card flex flex-col gap-4 px-8 py-7">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <h2 className="text-[19px] font-bold">Підписки</h2>
          <Link href="/pricing" className="text-accent underline">Оформити або змінити тариф</Link>
        </div>
        {visibleSubs.length === 0 && <p className="text-muted">Підписок ще немає. Перші 2 уроки кожного курсу — безкоштовно.</p>}
        {visibleSubs.map((sub) => {
          const live = isSubscriptionLive(toAccessSub(sub));
          return (
            <div key={sub.id} className="flex flex-col gap-3 rounded-2xl bg-ink px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-1">
                <span className="font-semibold">
                  {sub.plan.name} · {formatUah(sub.amount)}/міс · {sub.student?.name ?? "профіль видалено"}
                  {sub.course ? ` · ${sub.course.title}` : " · усі курси"}
                </span>
                <span className="text-sm text-muted">
                  {sub.status === "canceled"
                    ? live
                      ? `Скасовано — доступ до ${formatDate(sub.endsAt)}`
                      : "Скасовано"
                    : sub.status === "pending"
                      ? "Очікує оплату"
                      : `Наступне списання: ${formatDate(sub.endsAt)}`}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge tone={sub.status === "active" ? "good" : sub.status === "past_due" ? "bad" : sub.status === "pending" ? "wait" : "muted"}>
                  {SUBSCRIPTION_STATUS_LABELS[sub.status]}
                </StatusBadge>
                {sub.status === "pending" && (
                  <Link href={`/checkout/${sub.orderReference}`} className="btn-primary h-10">Оплатити</Link>
                )}
                {(sub.status === "active" || sub.status === "past_due" || sub.status === "pending") && (
                  <form action={cancelSubscription}>
                    <input type="hidden" name="subscriptionId" value={sub.id} />
                    <button className="btn-ghost h-10">Скасувати</button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
        {payments.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-muted hover:text-text">Історія платежів</summary>
            <table className="mt-3 w-full text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-2 font-medium">Дата</th>
                  <th className="py-2 font-medium">Замовлення</th>
                  <th className="py-2 font-medium">Сума</th>
                  <th className="py-2 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-line">
                    <td className="py-2">{formatDate(p.paidAt ?? p.createdAt)}</td>
                    <td className="py-2 font-mono">{p.orderId}</td>
                    <td className="py-2">{p.currency === "UAH" ? formatUah(p.amount) : `${p.amount / 100} ${p.currency}`}</td>
                    <td className="py-2">{PAYMENT_STATUS_LABELS[p.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
      </section>

      <section id="add-child" className="card flex flex-col gap-5 px-8 py-7">
        <h2 className="text-[19px] font-bold">Додати дитину</h2>
        <AddChildForm />
      </section>

      <section id="documents" className="card flex flex-col gap-4 px-8 py-7">
        <h2 className="text-[19px] font-bold">Документи й дані</h2>
        <p className="text-muted">
          Ваші згоди зберігаються з датою та версією документа.{" "}
          <Link href="/legal/oferta" className="text-accent underline">Оферта</Link> ·{" "}
          <Link href="/legal/privacy" className="text-accent underline">Конфіденційність</Link> ·{" "}
          <Link href="/legal/refund" className="text-accent underline">Повернення коштів</Link>
        </p>
        <ul className="flex flex-col gap-1.5 text-sm text-soft">
          {consents.map((c) => (
            <li key={c.id}>
              {formatDate(c.acceptedAt)} — {CONSENT_LABELS[c.type]} (версія {c.documentVersion})
            </li>
          ))}
        </ul>
        {kids.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-line pt-4">
            <p className="text-sm text-muted">
              Видалення профілю дитини назавжди стирає її прогрес і домашки та скасовує її підписки. Цю дію не можна відмінити.
            </p>
            <div className="flex flex-wrap gap-3">
              {kids.map((k) => (
                <details key={k.id} className="rounded-xl border border-danger/40 px-4 py-2">
                  <summary className="cursor-pointer text-danger">Видалити профіль «{k.name}»</summary>
                  <form action={deleteChild} className="mt-3 flex flex-col gap-2">
                    <input type="hidden" name="childId" value={k.id} />
                    <span className="text-sm text-muted">Точно видалити? Прогрес і домашки буде втрачено.</span>
                    <button className="btn h-10 bg-danger/15 text-danger hover:bg-danger/25">Так, видалити назавжди</button>
                  </form>
                </details>
              ))}
            </div>
          </div>
        )}
      </section>
    </CabinetShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card flex flex-col gap-2 px-6 py-5.5">
      <span className="text-sm text-muted">{label}</span>
      <span className="font-display text-2xl font-bold">{value}</span>
    </div>
  );
}
