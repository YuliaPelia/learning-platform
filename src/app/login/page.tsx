import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleButton, LoginForm } from "@/components/auth-forms";
import { Mascot } from "@/components/mascot";
import { PublicShell } from "@/components/site-chrome";
import { getCurrentUser, homeFor } from "@/lib/dal";

export const metadata: Metadata = { title: "Вхід" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  const { next, error } = await searchParams;
  const nextPath = typeof next === "string" ? next : undefined;
  return (
    <PublicShell>
      <div className="mx-auto grid max-w-[1040px] gap-4 px-3 pt-6 pb-10 md:px-6 lg:grid-cols-[1fr_440px]">
        <div className="relative hidden min-h-[560px] overflow-hidden rounded-(--radius-card) bg-[#efeafd] shadow-soft lg:block" aria-hidden>
          <Mascot framed cover className="absolute inset-0 rounded-none" sizes="600px" />
          <div className="absolute inset-x-5 bottom-5 rounded-[22px] bg-white/90 p-5 shadow-lift backdrop-blur-xl">
            <span className="text-xs font-bold tracking-wide text-accent uppercase">Робот Кодик</span>
            <p className="mt-1 font-semibold">З поверненням! Продовжимо з того місця, де зупинились?</p>
          </div>
        </div>
        <div className="card flex flex-col gap-5 p-7 sm:p-9">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-4xl font-extrabold">Вхід</h1>
            <p className="text-muted">Батьки і діти з поштою можуть увійти через Google. Дитина без пошти входить логіном і паролем.</p>
          </div>
          {error === "google" && (
            <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-danger">
              Не вдалося увійти через Google. Спробуйте ще раз.
            </p>
          )}
          <GoogleButton next={nextPath} />
          <div className="flex items-center gap-3 text-sm text-faint" aria-hidden>
            <span className="h-px flex-1 bg-line" /> або <span className="h-px flex-1 bg-line" />
          </div>
          <LoginForm next={nextPath} />
          <p className="text-center text-muted">
            Ще немає акаунта? <Link href="/register" className="font-semibold text-text underline decoration-line-2 underline-offset-4 hover:decoration-text">Зареєструватися</Link>
          </p>
        </div>
      </div>
    </PublicShell>
  );
}
