import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "@/components/auth-forms";
import { PublicShell } from "@/components/site-chrome";
import { getCurrentUser, homeFor } from "@/lib/dal";

export const metadata: Metadata = { title: "Відновлення пароля" };

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  return (
    <PublicShell>
      <div className="mx-auto flex max-w-[480px] flex-col gap-8 px-4 py-16">
        <div className="flex flex-col gap-3 text-center">
          <h1 className="font-display text-4xl font-bold">Відновлення пароля</h1>
          <p className="text-soft">Надішлемо на пошту код із 6 цифр — з ним ви зможете задати новий пароль.</p>
        </div>
        <div className="card flex flex-col gap-4 p-8">
          <ForgotPasswordForm />
        </div>
        <p className="text-center text-muted">
          Дитина входить без пошти? Попросіть батьків{" "}
          <Link href="/legal/contacts" className="text-accent underline">написати нам</Link> — допоможемо змінити пароль.
        </p>
        <p className="text-center text-muted">
          Згадали пароль? <Link href="/login" className="text-accent underline">Увійти</Link>
        </p>
      </div>
    </PublicShell>
  );
}
