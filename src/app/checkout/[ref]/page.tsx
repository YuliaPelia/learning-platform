import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/db";
import { simulatePayment } from "@/actions/checkout";
import { AutoSubmitForm } from "@/components/auto-submit-form";
import { PublicShell } from "@/components/site-chrome";
import { requireUser } from "@/lib/dal";
import { formatUah } from "@/lib/format";
import { appUrl } from "@/lib/mailer";
import { WFP_PAY_URL, buildPurchaseFields, getWfpConfig } from "@/lib/wayforpay";

export const metadata: Metadata = { title: "Оплата" };

/** Крок 2 оплати: форма з підписом, яка автоматично переводить на сторінку WayForPay. */
export default async function CheckoutPage({ params }: PageProps<"/checkout/[ref]">) {
  const parent = await requireUser("parent");
  const { ref } = await params;
  const sub = await prisma.subscription.findFirst({
    where: { orderReference: ref, userId: parent.id },
    include: { plan: { select: { name: true } }, course: { select: { title: true } }, student: { select: { name: true } } },
  });
  if (!sub) notFound();

  const productName = `ITCodeCraft, тариф «${sub.plan.name}»${sub.course ? `, курс ${sub.course.title}` : ""} — ${sub.student?.name ?? "учень"}`;

  if (sub.status !== "pending") {
    return (
      <PublicShell>
        <div className="mx-auto flex max-w-[640px] flex-col gap-4 px-4 py-20 text-center">
          <h1 className="font-display text-3xl font-bold">Це замовлення вже оброблено</h1>
          <Link href="/cabinet/parent" className="btn-primary self-center">До кабінету</Link>
        </div>
      </PublicShell>
    );
  }

  const cfg = getWfpConfig();
  const now = new Date();
  const nextCharge = new Date(now);
  nextCharge.setMonth(nextCharge.getMonth() + 1);
  const regularEnd = new Date(now);
  regularEnd.setFullYear(regularEnd.getFullYear() + 3);

  return (
    <PublicShell>
      <div className="mx-auto flex max-w-[640px] flex-col gap-6 px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Переходимо до оплати…</h1>
        <p className="text-lg text-soft">{productName}</p>
        <p className="text-muted">{formatUah(sub.amount)} щомісяця · скасування в кабінеті будь-коли</p>

        {cfg ? (
          <AutoSubmitForm
            action={WFP_PAY_URL}
            fields={buildPurchaseFields(cfg, {
              orderReference: sub.orderReference,
              orderDate: Math.floor(sub.createdAt.getTime() / 1000),
              amount: sub.amount / 100,
              productName,
              clientEmail: parent.email,
              returnUrl: appUrl("/api/payments/wayforpay/return"),
              serviceUrl: appUrl("/api/payments/wayforpay/callback"),
              nextChargeDate: nextCharge,
              regularEndDate: regularEnd,
            })}
          />
        ) : process.env.NODE_ENV !== "production" ? (
          <div className="card flex flex-col gap-4 p-6 text-left">
            <p className="font-semibold text-amber">Тестовий режим: WayForPay ще не налаштовано (.env.local)</p>
            <p className="text-muted">
              Натисніть кнопку, щоб імітувати успішну оплату й перевірити, як відкривається доступ. У продакшені цієї кнопки немає.
            </p>
            <form action={simulatePayment}>
              <input type="hidden" name="orderReference" value={sub.orderReference} />
              <button className="btn-primary">Імітувати успішну оплату</button>
            </form>
          </div>
        ) : (
          <p className="text-danger">Оплата тимчасово недоступна. Напишіть нам, будь ласка.</p>
        )}
      </div>
    </PublicShell>
  );
}
