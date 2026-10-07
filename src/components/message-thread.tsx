import { sendMessage } from "@/actions/messages";
import { formatDateTime } from "@/lib/format";

export type ThreadMessage = {
  id: string;
  body: string;
  createdAt: Date;
  author: { id: string; name: string; role: string };
};

/** Листування учня з викладачем щодо однієї домашки + форма нового повідомлення. */
export function MessageThread({
  submissionId,
  messages,
  viewerId,
  placeholder,
}: {
  submissionId: string;
  messages: ThreadMessage[];
  viewerId: string;
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {messages.length > 0 && (
        <ol className="flex flex-col gap-3">
          {messages.map((m) => {
            const mine = m.author.id === viewerId;
            return (
              <li key={m.id} className={`flex max-w-[85%] flex-col gap-1 rounded-2xl px-4 py-3 ${mine ? "self-end bg-[#1f3029]" : "self-start bg-ink"}`}>
                <span className="text-[13px] text-muted">
                  {mine ? "Ви" : m.author.role === "teacher" ? `Викладач ${m.author.name}` : m.author.name} · {formatDateTime(m.createdAt)}
                </span>
                <p className="leading-relaxed break-words whitespace-pre-wrap">{m.body}</p>
              </li>
            );
          })}
        </ol>
      )}
      <form action={sendMessage} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <input type="hidden" name="submissionId" value={submissionId} />
        <div className="flex-1">
          <label htmlFor={`msg-${submissionId}`} className="sr-only">Повідомлення</label>
          <textarea id={`msg-${submissionId}`} name="body" required maxLength={2000} rows={2} className="field h-auto py-3" placeholder={placeholder} />
        </div>
        <button className="btn-ghost shrink-0">Надіслати</button>
      </form>
    </div>
  );
}
