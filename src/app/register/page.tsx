import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleButton, RegisterForm } from "@/components/auth-forms";
import { Mascot } from "@/components/mascot";
import { PublicShell } from "@/components/site-chrome";
import { getCurrentUser, homeFor } from "@/lib/dal";

export const metadata: Metadata = { title: "Реєстрація" };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  const { next } = await searchParams;
  return (
    <PublicShell>
      <div className="mx-auto grid max-w-[1100px] gap-4 px-3 pt-6 pb-10 md:px-6 lg:grid-cols-2">
        <div className="bg-pearl relative flex flex-col gap-5 overflow-hidden rounded-(--radius-card) p-7 shadow-soft sm:p-10 lg:pb-[300px]">
          <h1 className="font-display text-4xl font-extrabold md:text-[44px]">Акаунт для батьків</h1>
          <p className="text-lg leading-relaxed text-soft">
            Реєструються батьки — так ви контролюєте навчання й оплату. Після реєстрації створіть профіль дитини з її власним логіном:
            дитина входитиме сама й одразу отримає 2 безкоштовні уроки будь-якого курсу.
          </p>
          <ol className="relative z-10 flex flex-col gap-2 text-soft">
            <li className="flex items-center gap-3 rounded-full bg-white/80 py-1.5 pr-4 pl-1.5 font-semibold backdrop-blur"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-text text-white font-mono text-xs">01</span> Створіть акаунт</li>
            <li className="flex items-center gap-3 rounded-full bg-white/80 py-1.5 pr-4 pl-1.5 font-semibold backdrop-blur"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 font-mono text-xs">02</span> Додайте дитину (ім’я, рік народження, логін)</li>
            <li className="flex items-center gap-3 rounded-full bg-white/80 py-1.5 pr-4 pl-1.5 font-semibold backdrop-blur"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 font-mono text-xs">03</span> Дитина входить і починає навчання, а ви відстежуєте її прогрес</li>
          </ol>
          <Mascot className="absolute right-0 bottom-0 hidden h-[290px] w-[370px] lg:block" sizes="370px" />
        </div>
        <div className="card flex flex-col gap-4 p-7 sm:p-9">
          <GoogleButton next={typeof next === "string" ? next : undefined} />
          <p className="text-center text-sm text-muted">або заповніть форму</p>
          <RegisterForm next={typeof next === "string" ? next : undefined} />
          <p className="mt-6 text-center text-muted">
            Вже маєте акаунт? <Link href="/login" className="font-semibold text-text underline decoration-line-2 underline-offset-4 hover:decoration-text">Увійти</Link>
          </p>
        </div>
      </div>
    </PublicShell>
  );
}
