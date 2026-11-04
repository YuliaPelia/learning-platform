import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/dal";
import { UPLOAD_KINDS, isUploadKind } from "@/lib/uploads";

/**
 * Видає браузеру одноразовий токен для прямого завантаження файлу у Vercel Blob
 * (відео завеликі для тіла запиту на Vercel — тому файл іде повз сервер).
 * Обкладинки — лише адмін; відео — викладач і адмін. Тип і розмір обмежені на боці токена.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Потрібен вхід" }, { status: 401 });

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return Response.json({ error: "Некоректний запит" }, { status: 400 });
  }

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const kind = clientPayload;
        if (!isUploadKind(kind)) throw new Error("Невідомий тип файлу");
        const rule = UPLOAD_KINDS[kind];
        if (!(rule.roles as readonly string[]).includes(user.role)) throw new Error("Недостатньо прав");
        if (!pathname.startsWith(`${rule.folder}/`)) throw new Error("Некоректний шлях файлу");
        return {
          allowedContentTypes: [...rule.contentTypes],
          maximumSizeInBytes: rule.maxBytes,
          // Випадковий суфікс робить посилання непередбачуваним
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(json);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Не вдалося почати завантаження" }, { status: 400 });
  }
}
