import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { UPLOAD_KINDS } from "./uploads";

/**
 * Файли з ПРИВАТНОГО сховища Vercel Blob браузер напряму не відкриє — їх віддає /api/media/<шлях>.
 *  - Обкладинки (covers/…) — публічні: курс видно всім, тож посилання без підпису (кешується CDN).
 *  - Відео (videos/…) — лише за підписаним посиланням з терміном дії. Підпис ставить сервер
 *    ПІСЛЯ перевірки доступу до уроку, тож переслане посилання перестає працювати за кілька годин.
 * Посилання YouTube/Vimeo і старі публічні файли повертаються без змін.
 */

const PRIVATE_HOST = ".private.blob.vercel-storage.com";
const PUBLIC_FOLDERS = [UPLOAD_KINDS.cover.folder] as const;
const SIGNED_FOLDERS = [UPLOAD_KINDS.video.folder] as const;
/** Скільки живе посилання на відео: вистачає на урок, але не на роздачу іншим. */
export const VIDEO_LINK_TTL_SECONDS = 6 * 60 * 60;

function mediaKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET має бути щонайменше 32 символи");
  // Окремий ключ, похідний від SESSION_SECRET: підпис відео не можна використати як сесію і навпаки
  return createHmac("sha256", secret).update("media-url-v1").digest();
}

const sign = (pathname: string, exp: number) =>
  createHmac("sha256", mediaKey()).update(`${pathname}\n${exp}`).digest("base64url");

/** Шлях усередині сховища (без початкового «/») для посилань на приватне сховище; інакше null. */
export function privateBlobPathname(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || !u.hostname.endsWith(PRIVATE_HOST)) return null;
    return decodeURIComponent(u.pathname.slice(1));
  } catch {
    return null;
  }
}

/** Чи можна віддавати цей шлях через /api/media: лише наші папки й без «..». */
export function isServablePath(pathname: string): boolean {
  const [folder, ...rest] = pathname.split("/");
  if (!rest.length || rest.some((s) => !s || s === "." || s === "..")) return false;
  return ([...PUBLIC_FOLDERS, ...SIGNED_FOLDERS] as readonly string[]).includes(folder);
}

export const needsSignature = (pathname: string) =>
  (SIGNED_FOLDERS as readonly string[]).includes(pathname.split("/")[0]);

/** Перевіряє підпис і термін дії посилання на відео. */
export function verifyMediaSignature(pathname: string, exp: string | null, sig: string | null, now = Date.now()): boolean {
  const e = Number(exp);
  if (!sig || !Number.isInteger(e) || e * 1000 < now) return false;
  const expected = Buffer.from(sign(pathname, e));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

function appOrigin() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Збережене посилання → адреса, яку можна віддати браузеру чи застосунку.
 * Викликати ЛИШЕ після того, як доступ до уроку вже перевірено.
 * absolute: true — повна адреса з APP_URL (для мобільного застосунку).
 */
export function mediaSrc(url: string, opts: { absolute?: boolean; now?: number } = {}): string {
  const pathname = privateBlobPathname(url);
  if (!pathname || !isServablePath(pathname)) return url;
  const path = `/api/media/${pathname.split("/").map(encodeURIComponent).join("/")}`;
  let src = path;
  if (needsSignature(pathname)) {
    const exp = Math.floor((opts.now ?? Date.now()) / 1000) + VIDEO_LINK_TTL_SECONDS;
    src = `${path}?exp=${exp}&sig=${sign(pathname, exp)}`;
  }
  return opts.absolute ? `${appOrigin()}${src}` : src;
}

/** Те саме для необов'язкових полів (обкладинка курсу). */
export const mediaSrcOrNull = (url: string | null | undefined, opts?: { absolute?: boolean }) =>
  url ? mediaSrc(url, opts) : null;
