import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleButton, LoginForm } from "@/components/auth-forms";
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
      <div className="mx-auto flex max-w-[480px] flex-col gap-8 px-4 py-16">
        <div className="flex flex-col gap-3 text-center">
          <h1 className="font-display text-4xl font-bold">Вхід</h1>
          <p className="text-soft">Батьки і діти з поштою можуть увійти через Google. Дитина без пошти входить логіном і паролем.</p>
        </div>
        <div className="card flex flex-col gap-4 p-8">
          {error === "google" && (
            <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-danger">
              Не вдалося увійти через Google. Спробуйте ще раз.
            </p>
          )}
          <GoogleButton next={nextPath} />
          <p className="text-center text-sm text-muted">або</p>
          <LoginForm next={nextPath} />
        </div>
        <p className="text-center text-muted">
          Ще немає акаунта? <Link href="/register" className="text-accent underline">Зареєструватися</Link>
        </p>
      </div>
    </PublicShell>
  );
}
