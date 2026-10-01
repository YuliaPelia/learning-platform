import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { PublicShell } from "@/components/site-chrome";
import { getCurrentUser, homeFor } from "@/lib/dal";

export const metadata: Metadata = { title: "Вхід" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  const { next } = await searchParams;
  return (
    <PublicShell>
      <div className="mx-auto flex max-w-[480px] flex-col gap-8 px-4 py-16">
        <div className="flex flex-col gap-3 text-center">
          <h1 className="font-display text-4xl font-bold">Вхід</h1>
          <p className="text-soft">Батьки — за email, діти — за логіном, який створили батьки.</p>
        </div>
        <div className="card p-8">
          <LoginForm next={typeof next === "string" ? next : undefined} />
        </div>
        <p className="text-center text-muted">
          Ще немає акаунта? <Link href="/register" className="text-accent underline">Зареєструватися</Link>
        </p>
      </div>
    </PublicShell>
  );
}
