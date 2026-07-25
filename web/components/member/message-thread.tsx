"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthHeaders, authFetchJson } from "@/lib/api/client";

export type ThreadMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  isMine: boolean;
};

type MessageThreadProps = {
  role: "member" | "coach";
  memberId?: string;
  coachName?: string;
  compact?: boolean;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MessageThread({
  role,
  memberId,
  coachName = "Coach Helna",
  compact = false,
}: MessageThreadProps) {
  const getHeaders = useAuthHeaders();
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const threadUrl =
    role === "coach" && memberId
      ? `/api/messages?memberId=${encodeURIComponent(memberId)}`
      : "/api/messages";

  const loadThread = useCallback(async () => {
    const { data, error: fetchError } = await authFetchJson<{ messages: ThreadMessage[] }>(
      threadUrl,
      {},
      getHeaders,
    );
    if (fetchError) {
      setError(fetchError);
    } else if (data) {
      setMessages(data.messages);
      setError(null);
    }
    setLoading(false);
  }, [getHeaders, threadUrl]);

  useEffect(() => {
    void loadThread();
    const interval = setInterval(() => {
      void loadThread();
    }, 10_000);
    return () => clearInterval(interval);
  }, [loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    const payload =
      role === "coach" && memberId
        ? { memberId, body: text }
        : { body: text };

    const { data: created, error: sendError } = await authFetchJson<ThreadMessage>(
      "/api/messages",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      getHeaders,
    );

    if (sendError || !created) {
      setError(sendError ?? "Could not send message");
    } else {
      setMessages((prev) => [...prev, created]);
      setDraft("");
      setError(null);
    }
    setSending(false);
  }

  const containerClass = compact
    ? "flex h-80 flex-col rounded-2xl border border-white/10 bg-[var(--brand-dark-surface)]"
    : "flex min-h-[calc(100dvh-12rem)] flex-col";

  return (
    <div className={containerClass}>
      {!compact && (
        <header className="mb-4">
          <h1 className="font-heading text-2xl">Messages</h1>
          <p className="text-sm text-white/60">Chat with {coachName}</p>
        </header>
      )}

      <div
        className={`flex-1 space-y-3 overflow-y-auto ${compact ? "p-3" : "pb-4"}`}
        aria-live="polite"
      >
        {loading && (
          <p className="text-center text-sm text-white/50">Loading messages…</p>
        )}
        {!loading && messages.length === 0 && (
          <p className="text-center text-sm text-white/50">Say hi to your coach</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.isMine ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                msg.isMine
                  ? "bg-[var(--brand-diet)] text-[var(--brand-dark)]"
                  : "bg-white/10 text-white"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{msg.body}</p>
              <p
                className={`mt-1 text-[10px] ${
                  msg.isMine ? "text-[var(--brand-dark)]/60" : "text-white/40"
                }`}
              >
                {formatTime(msg.createdAt)}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="mb-2 text-center text-xs text-red-400" role="alert">
          {error}
        </p>
      )}

      <form
        onSubmit={handleSend}
        className={`sticky bottom-0 flex gap-2 border-t border-white/10 bg-[var(--brand-dark)] pt-3 ${
          compact ? "px-3 pb-3" : "pb-4"
        }`}
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          maxLength={2000}
          className="min-w-0 flex-1 rounded-xl border border-white/15 bg-[var(--brand-dark-surface)] px-4 py-3 text-sm"
          aria-label="Message"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="tap-target shrink-0 rounded-xl bg-[var(--brand-diet)] px-5 py-3 text-sm font-semibold text-[var(--brand-dark)] disabled:opacity-50"
        >
          {sending ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}
