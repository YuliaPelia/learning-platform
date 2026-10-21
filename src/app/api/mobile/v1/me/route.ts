import { publicUser, requireMobileUser } from "@/lib/mobile/http";

export async function GET(request: Request) {
  const auth = await requireMobileUser(request);
  if (!auth.user) return auth.response;
  return Response.json({ user: publicUser(auth.user) });
}
