import { redirect } from "next/navigation";
import { homeFor, requireUser } from "@/lib/dal";

/** /cabinet — розводимо на кабінет батьків, дитини, викладача чи адміна. */
export default async function CabinetIndex() {
  const user = await requireUser();
  redirect(homeFor(user.role));
}
