import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GoogleRoleForm } from "@/components/google-role-form";
import { PublicShell } from "@/components/site-chrome";
import { GOOGLE_SIGNUP_COOKIE, readGoogleSignup } from "@/lib/google-auth";

export const metadata: Metadata = { title: "Хто ви?" };

export default async function GoogleRolePage() {
  const jar = await cookies();
  const signup = await readGoogleSignup(jar.get(GOOGLE_SIGNUP_COOKIE)?.value);
  if (!signup) redirect("/login?error=google");

  return (
    <PublicShell>
      <div className="mx-auto flex max-w-[480px] flex-col gap-8 px-4 py-16">
        <div className="flex flex-col gap-3 text-center">
          <h1 className="font-display text-4xl font-bold">Хто ви?</h1>
          <p className="text-soft">Пошти {signup.email} ще немає в ITCodeCraft. Оберіть, який акаунт створити.</p>
        </div>
        <div className="card p-8">
          <GoogleRoleForm email={signup.email} defaultName={signup.name} />
        </div>
      </div>
    </PublicShell>
  );
}
