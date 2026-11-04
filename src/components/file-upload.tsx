"use client";

import { upload } from "@vercel/blob/client";
import { useId, useRef, useState } from "react";
import { UPLOAD_KINDS, type UploadKind } from "@/lib/uploads";

/**
 * Завантаження файлу напряму у Vercel Blob з прогресом. Результат — посилання, яке
 * передається вгору через onChange (форма кладе його у приховане/звичайне поле).
 */
export function FileUpload({
  kind,
  value,
  onChange,
  label,
}: {
  kind: UploadKind;
  value: string;
  onChange: (url: string) => void;
  label: string;
}) {
  const rule = UPLOAD_KINDS[kind];
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = progress !== null;

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!(rule.contentTypes as readonly string[]).includes(file.type)) {
      setError(kind === "cover" ? "Потрібен файл JPG, PNG або WebP" : "Потрібен файл MP4 або WebM");
      return;
    }
    if (file.size > rule.maxBytes) {
      setError(`Файл завеликий (максимум ${Math.round(rule.maxBytes / 1024 / 1024)} МБ)`);
      return;
    }
    setProgress(0);
    try {
      const safe = file.name.replace(/[^\w.-]+/g, "-").slice(-80);
      const blob = await upload(`${rule.folder}/${safe}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        clientPayload: kind,
        multipart: file.size > 20 * 1024 * 1024,
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      });
      onChange(blob.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося завантажити файл");
    } finally {
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {value && kind === "cover" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="Обкладинка курсу" className="aspect-[16/9] w-full max-w-[420px] rounded-2xl object-cover" />
      )}
      {value && kind === "video" && /\.(mp4|webm)(\?|$)/i.test(value) && (
        <video src={value} controls preload="metadata" className="aspect-video w-full max-w-[420px] rounded-2xl bg-ink" />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={id} className={`btn-ghost h-11 cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
          {busy ? `Завантажуємо… ${progress}%` : value ? `Замінити: ${label}` : `Завантажити: ${label}`}
        </label>
        <input
          id={id}
          ref={input}
          type="file"
          accept={rule.contentTypes.join(",")}
          className="sr-only"
          disabled={busy}
          onChange={(e) => pick(e.target.files?.[0])}
        />
        {value && !busy && kind === "cover" && (
          <button type="button" className="text-sm font-semibold text-danger hover:underline" onClick={() => onChange("")}>
            Прибрати
          </button>
        )}
      </div>
      {busy && (
        <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress ?? 0} className="h-2 w-full max-w-[420px] overflow-hidden rounded-full bg-line">
          <div className="h-full bg-accent transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
