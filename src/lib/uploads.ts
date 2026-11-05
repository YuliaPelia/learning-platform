/** Що можна завантажувати через /api/upload: хто, куди, які типи й яка межа розміру. */
export const UPLOAD_KINDS = {
  cover: {
    folder: "covers",
    roles: ["admin"],
    contentTypes: ["image/jpeg", "image/png", "image/webp"],
    maxBytes: 5 * 1024 * 1024,
  },
  video: {
    folder: "videos",
    roles: ["admin", "teacher"],
    contentTypes: ["video/mp4", "video/webm"],
    maxBytes: 1024 * 1024 * 1024,
  },
} as const;

export type UploadKind = keyof typeof UPLOAD_KINDS;

/** Файл із приватного сховища Vercel Blob (браузер напряму його не відкриє). */
export function isPrivateBlobUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".private.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/**
 * Адреса для попереднього перегляду ОБКЛАДИНКИ у формі адміна. Обкладинки публічні й
 * віддаються через /api/media без підпису (див. src/lib/media.ts), тож це можна порахувати в браузері.
 */
export function coverPreviewSrc(url: string): string {
  if (!isPrivateBlobUrl(url)) return url;
  return `/api/media/${new URL(url).pathname.slice(1)}`;
}

export const isUploadKind = (v: unknown): v is UploadKind => typeof v === "string" && v in UPLOAD_KINDS;
