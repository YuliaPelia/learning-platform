import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleButton, RegisterForm } from "@/components/auth-forms";
import { PublicShell } from "@/components/site-chrome";
import { getCurrentUser, homeFor } from "@/lib/dal";

export const metadata: Metadata = { title: "Реєстрація" };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  const { next } = await searchParams;
  return (
    <PublicShell>
      <div className="mx-auto grid max-w-[1100px] gap-12 px-4 py-16 md:px-6 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <h1 className="font-display text-4xl font-bold">Акаунт для батьків</h1>
          <p className="text-lg leading-relaxed text-soft">
            Реєструються батьки — так ви контролюєте навчання й оплату. Після реєстрації створіть профіль дитини з її власним логіном:
            дитина входитиме сама й одразу отримає 2 безкоштовні уроки будь-якого курсу.
          </p>
          <ol className="flex flex-col gap-3 text-soft">
            <li><span className="font-mono text-accent">01</span> Створіть акаунт</li>
            <li><span className="font-mono text-accent">02</span> Додайте дитину (ім’я, рік народження, логін)</li>
            <li><span className="font-mono text-accent">03</span> Дитина входить і починає навчання, а ви відстежуєте її прогрес</li>
          </ol>
        </div>
        <div className="card flex flex-col gap-4 p-8">
          <GoogleButton next={typeof next === "string" ? next : undefined} />
          <p className="text-center text-sm text-muted">або заповніть форму</p>
          <RegisterForm next={typeof next === "string" ? next : undefined} />
          <p className="mt-6 text-center text-muted">
            Вже маєте акаунт? <Link href="/login" className="text-accent underline">Увійти</Link>
          </p>
        </div>
      </div>
    </PublicShell>
  );
}
