import { get } from "@vercel/blob";
import { isServablePath, needsSignature, verifyMediaSignature } from "@/lib/media";

/**
 * Віддає файли з приватного сховища Vercel Blob (див. src/lib/media.ts).
 * Обкладинки — усім (з довгим кешем); відео — лише за чинним підписаним посиланням.
 * Підтримує Range-запити, без яких у відео не працює перемотування.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/media/[...path]">) {
  const { path } = await ctx.params;
  const pathname = path.join("/");
  if (!isServablePath(pathname)) return new Response("Not found", { status: 404 });

  const signed = needsSignature(pathname);
  if (signed) {
    const sp = new URL(request.url).searchParams;
    if (!verifyMediaSignature(pathname, sp.get("exp"), sp.get("sig"))) {
      return new Response("Посилання недійсне або застаріло — оновіть сторінку уроку", { status: 403 });
    }
  }

  const range = request.headers.get("range");
  const ifNoneMatch = request.headers.get("if-none-match") ?? undefined;
  let result;
  try {
    result = await get(pathname, { access: "private", ifNoneMatch, headers: range ? { range } : undefined });
  } catch (e) {
    console.error("[media] не вдалося прочитати файл", pathname, e);
    return new Response("Не вдалося завантажити файл", { status: 502 });
  }
  if (!result) return new Response("Not found", { status: 404 });

  const headers = new Headers({
    "Accept-Ranges": "bytes",
    // Відео — тільки в браузері глядача (посилання персональне й тимчасове);
    // обкладинки можна кешувати CDN — так майже не витрачаються операції сховища.
    "Cache-Control": signed ? "private, max-age=3600" : "public, max-age=86400, s-maxage=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  });
  for (const h of ["content-type", "content-length", "content-range", "etag", "last-modified"]) {
    const v = result.headers.get(h);
    if (v) headers.set(h, v);
  }
  if (result.statusCode === 304) return new Response(null, { status: 304, headers });
  return new Response(result.stream, { status: headers.has("content-range") ? 206 : 200, headers });
}
