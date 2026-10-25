"use server";

import { redirect } from "next/navigation";
import { deleteAccount } from "@/lib/account";
import { requireUser } from "@/lib/dal";
import { deleteSession } from "@/lib/session";
import type { FormState } from "@/lib/validation";

/** Видалення власного акаунта з кабінету (батьки або учень, що зареєструвався сам). */
export async function deleteMyAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("parent", "student");
  // Друге підтвердження: незворотна дія не має статися від випадкового кліку
  if (formData.get("confirm") !== "on") return { error: "Підтвердіть, що розумієте наслідки видалення" };

  const res = await deleteAccount(user);
  if (!res.ok) return { error: res.error };
  await deleteSession();
  redirect("/delete-account?done=1");
}
