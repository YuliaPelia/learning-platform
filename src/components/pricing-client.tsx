"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { startCheckout } from "@/actions/checkout";
import { IconCheck, IconLock, IconX } from "@/components/icons";
import type { Plan, PlanId } from "@/lib/plans";

type Props = {
  plans: Plan[];
  features: Array<[string, boolean, boolean, boolean]>;
  initialPlan: PlanId;
  viewer: "guest" | "parent" | "other";
  childrenList: { id: string; name: string }[];
  courses: { id: string; title: string }[];
};

export function PricingClient({ plans, features, initialPlan, viewer, childrenList, courses }: Props) {
  const [planId, setPlanId] = useState<PlanId>(initialPlan);
  const [consentOffer, setConsentOffer] = useState(false);
  const [consentImmediate, setConsentImmediate] = useState(false);
  const [state, action, pending] = useActionState(startCheckout, undefined);
  const plan = plans.find((p) => p.id === planId)!;
  const ready = consentOffer && consentImmediate;

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((p, i) => {
          const selected = p.id === planId;
          return (
            <div
              key={p.id}
              className={`flex flex-col gap-4.5 rounded-3xl px-8 pt-7 pb-9 ${selected ? "border-2 border-accent bg-[#1a1f3f]" : "border border-line bg-surface"}`}
            >
              <div className="h-7">
                {p.popular && <span className="rounded-full bg-[#3a2e14] px-3 py-1 text-[13px] font-bold text-amber">Найпопулярніший</span>}
              </div>
              <h2 className="font-display text-[26px] font-bold">{p.name}</h2>
              <p className="min-h-12 leading-relaxed text-muted">{p.description}</p>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-[44px] font-bold">{p.price}</span>
                <span className="text-[17px] text-muted">грн / місяць</span>
              </div>
              <button
                type="button"
                onClick={() => setPlanId(p.id)}
                aria-pressed={selected}
                className={selected ? "btn-primary h-[52px] text-[17px]" : "btn-ghost h-[52px] text-[17px]"}
              >
                {selected ? "Обрано" : `Обрати ${p.name}`}
              </button>
              <div className="h-px bg-line" />
              <ul className="flex flex-col gap-3.5">
                <li className="flex gap-3">
                  <IconCheck className="mt-0.5 shrink-0 text-accent" />
                  <span>{p.allCourses ? "Усі курси + новинки раніше за всіх" : "1 курс на вибір"}</span>
                </li>
                {features.map(([text, ...flags]) => {
                  const on = flags[i];
                  return (
                    <li key={text} className="flex gap-3">
                      {on ? <IconCheck className="mt-0.5 shrink-0 text-accent" /> : <IconX className="mt-0.5 shrink-0 text-faint" />}
                      <span className={on ? "" : "text-faint"}>
                        {text}
                        <span className="sr-only">{on ? " — є" : " — немає"}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <section className="mt-12 grid gap-14 rounded-[28px] border border-line-2 bg-surface px-6 py-10 md:px-12 lg:grid-cols-2" aria-labelledby="checkout-title">
        <div className="flex flex-col gap-4.5">
          <h2 id="checkout-title" className="font-display text-2xl font-bold">Оформлення підписки</h2>
          <Row label="Тариф" value={plan.name} />
          <Row label="Сума щомісяця" value={`${plan.price} грн`} />
          <Row label="Наступне списання" value="через 1 місяць" />
          <p className="rounded-xl bg-ink px-4 py-3.5 text-[15px] leading-relaxed text-muted">
            За 3 дні до списання надішлемо нагадування на пошту. Скасування — в кабінеті батьків, одним кліком.
          </p>
        </div>

        {viewer !== "parent" ? (
          <div className="flex flex-col justify-center gap-4">
            <p className="text-lg text-soft">
              {viewer === "guest"
                ? "Щоб оформити підписку, створіть акаунт батьків — це хвилина. Перші 2 уроки дитина пройде безкоштовно."
                : "Оформити підписку можуть лише батьки зі свого кабінету."}
            </p>
            {viewer === "guest" && (
              <div className="flex flex-wrap gap-3">
                <Link href={`/register?next=${encodeURIComponent(`/pricing?plan=${plan.id}`)}`} className="btn-primary">
                  Створити акаунт батьків
                </Link>
                <Link href={`/login?next=${encodeURIComponent(`/pricing?plan=${plan.id}`)}`} className="btn-ghost">
                  Увійти
                </Link>
              </div>
            )}
          </div>
        ) : childrenList.length === 0 ? (
          <div className="flex flex-col justify-center gap-4">
            <p className="text-lg text-soft">Спочатку додайте профіль дитини — підписка оформлюється на конкретну дитину.</p>
            <Link href="/cabinet/parent#add-child" className="btn-primary self-start">
              Додати дитину
            </Link>
          </div>
        ) : (
          <form action={action} className="flex flex-col gap-4.5">
            <input type="hidden" name="plan" value={plan.id} />
            <div>
              <label htmlFor="studentId" className="label">
                Для кого
              </label>
              <select id="studentId" name="studentId" className="field" required defaultValue={state?.values?.studentId}>
                {childrenList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {!plan.allCourses && (
              <div>
                <label htmlFor="courseId" className="label">
                  Курс
                </label>
                <select id="courseId" name="courseId" className="field" required defaultValue={state?.values?.courseId}>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <label className="flex cursor-pointer items-start gap-3.5 leading-relaxed">
              <input
                type="checkbox"
                name="consentOffer"
                checked={consentOffer}
                onChange={(e) => setConsentOffer(e.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 accent-accent"
              />
              <span>
                Я ознайомився(-лась) і приймаю умови{" "}
                <Link href="/legal/oferta" target="_blank" className="text-accent underline">
                  Публічної оферти
                </Link>{" "}
                та{" "}
                <Link href="/legal/refund" target="_blank" className="text-accent underline">
                  Політики повернення коштів
                </Link>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3.5 leading-relaxed">
              <input
                type="checkbox"
                name="consentImmediate"
                checked={consentImmediate}
                onChange={(e) => setConsentImmediate(e.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 accent-accent"
              />
              <span>
                Погоджуюсь на негайний доступ до уроків після оплати й розумію, що втрачаю право на відмову від договору щодо вже наданого
                цифрового контенту
              </span>
            </label>
            {state?.error && (
              <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-danger">
                {state.error}
              </p>
            )}
            <button type="submit" disabled={!ready || pending} className="btn-primary h-14 text-lg">
              {pending ? "Готуємо оплату…" : `Оплатити ${plan.price} грн через WayForPay`}
            </button>
            <p className="flex items-center justify-center gap-2 text-sm text-muted">
              <IconLock size={16} /> Захищена оплата WayForPay · Visa, Mastercard, Apple Pay, Google Pay
            </p>
          </form>
        )}
      </section>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-lg">
      <span className="text-muted">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
