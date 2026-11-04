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

export const isUploadKind = (v: unknown): v is UploadKind => typeof v === "string" && v in UPLOAD_KINDS;
