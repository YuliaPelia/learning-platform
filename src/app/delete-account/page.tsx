import type { Metadata } from "next";
import Link from "next/link";
import { Notice } from "@/components/notice";
import { PublicShell } from "@/components/site-chrome";

export const metadata: Metadata = { title: "Видалення акаунта" };

/** Публічна сторінка про видалення акаунта — її адресу вказуємо в Google Play (Data safety) і в політиці. */
export default async function DeleteAccountPage({ searchParams }: PageProps<"/delete-account">) {
  const sp = await searchParams;
  return (
    <PublicShell>
      <article className="mx-auto flex max-w-[820px] flex-col gap-6 px-4 py-14 md:px-6">
        {sp.done && <Notice tone="success">Ваш акаунт видалено. Дякуємо, що були з нами.</Notice>}
        <h1 className="font-display text-3xl font-bold md:text-4xl">Видалення акаунта ITCodeCraft</h1>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">Як видалити</h2>
          <ul className="flex list-disc flex-col gap-2 pl-5 leading-relaxed text-soft">
            <li><b className="text-text">У мобільному додатку:</b> Профіль → «Видалити акаунт».</li>
            <li>
              <b className="text-text">На сайті:</b> увійдіть і відкрийте{" "}
              кабінет: батьки — <Link href="/cabinet/parent#documents" className="text-accent underline">«Документи й дані»</Link>, учні —{" "}
              <Link href="/cabinet/student" className="text-accent underline">унизу сторінки кабінету</Link> → «Видалити мій акаунт».
            </li>
            <li><b className="text-text">Профіль дитини</b> видаляють батьки — у кабінеті на сайті або в додатку (Профіль → Діти).</li>
            <li>
              <b className="text-text">Немає доступу до акаунта?</b> Напишіть на{" "}
              <a href="mailto:itcodecraft@gmail.com" className="text-accent underline">itcodecraft@gmail.com</a> з адреси, прив’язаної до акаунта.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">Що видаляється</h2>
          <ul className="flex list-disc flex-col gap-2 pl-5 leading-relaxed text-soft">
            <li>Ім’я, email, логін, пароль і прив’язка входу через Google чи Apple.</li>
            <li>Профілі дітей разом з прогресом, балами, домашніми завданнями й листуванням з викладачем.</li>
            <li>Усі активні підписки скасовуються, регулярні списання зупиняються.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">Що зберігається</h2>
          <p className="leading-relaxed text-soft">
            Для бухгалтерського обліку й вирішення спорів у строки, визначені законодавством, зберігаються лише сума, дата й номер замовлення кожного платежу, а також дата, версія документа, IP-адреса й браузер у момент прийняття кожної згоди. Відповідь
            платіжної системи (email, телефон, маска картки) і токен регулярних списань видаляються. Детальніше — у{" "}
            <Link href="/legal/privacy" className="text-accent underline">Політиці конфіденційності</Link>.
          </p>
        </section>
      </article>
    </PublicShell>
  );
}
