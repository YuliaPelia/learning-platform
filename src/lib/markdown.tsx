import type { ReactNode } from "react";

/**
 * Мінімальний безпечний рендер Markdown для уроків:
 * ## заголовки, абзаци, списки "- ", блоки коду ```, **жирний**, `код`.
 * Ми НЕ вставляємо HTML напряму (жодного dangerouslySetInnerHTML) — тому
 * навіть якщо в урок потрапить <script>, він покажеться як текст.
 */
function inline(text: string, keyBase: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((p, i) => {
    const key = `${keyBase}-${i}`;
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={key}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`"))
      return (
        <code key={key} className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[0.9em] text-accent">
          {p.slice(1, -1)}
        </code>
      );
    return <span key={key}>{p}</span>;
  });
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) code.push(lines[i++]);
      i++;
      out.push(
        <pre key={`c${i}`} className="overflow-x-auto rounded-2xl bg-ink p-5 font-mono text-[15px] leading-relaxed text-soft">
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }
    if (line.startsWith("## ")) {
      out.push(
        <h2 key={`h${i}`} className="font-display text-2xl font-bold">
          {inline(line.slice(3), `h${i}`)}
        </h2>,
      );
      i++;
      continue;
    }
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) items.push(lines[i++].slice(2));
      out.push(
        <ul key={`u${i}`} className="list-disc space-y-1.5 pl-6">
          {items.map((it, j) => (
            <li key={j}>{inline(it, `u${i}-${j}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    if (line.trim() === "") {
      i++;
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !/^(## |- |```)/.test(lines[i])) para.push(lines[i++]);
    out.push(<p key={`p${i}`}>{inline(para.join(" "), `p${i}`)}</p>);
  }
  return <div className="space-y-5 text-lg leading-relaxed text-soft">{out}</div>;
}
