import "server-only";

/**
 * Надсилання листів. Якщо є RESEND_API_KEY — через Resend (resend.com),
 * інакше лист друкується в консоль (зручно під час розробки).
 */
export async function sendEmail(to: string | null | undefined, subject: string, text: string) {
  if (!to) return false;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`\n📧 [лист не надіслано — немає RESEND_API_KEY]\nКому: ${to}\nТема: ${subject}\n${text}\n`);
    return false;
  }
  // Помилка листа (мережа, 4xx/5xx) не має ламати основний потік — лише логуємо
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text }),
    });
    if (!res.ok) {
      console.error("Не вдалося надіслати лист", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("Не вдалося надіслати лист", e);
    return false;
  }
}

export function appUrl(path = "") {
  return `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}${path}`;
}
