"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import type { ChatMessage } from "@/lib/api/chat-api";
import { formatAppDateTimeShort } from "@/lib/format-datetime";
import { Btn } from "@/components/portal-atoms";

type FetcherResult =
  | { ok: true; data: { items: ChatMessage[] } }
  | { ok: false; message: string };

type ChatThreadProps = {
  appointmentId: string;
  /** "patient" → align own bubbles right; "admin" → align right for admin-authored. */
  viewerRole: "PATIENT" | "ADMIN";
  fetcher: (appointmentId: string) => Promise<FetcherResult>;
  poster: (appointmentId: string, body: string) => Promise<FetcherResult>;
  /** Polling interval in ms; 10s default keeps it lively without hammering. */
  pollIntervalMs?: number;
};

/**
 * Polling-based chat thread. Both the patient surface and the admin
 * surface render this same component; the only difference is which API
 * helper they pass in.
 *
 * Polls every `pollIntervalMs` while mounted + visible. Pauses when the
 * tab is hidden (visibilitychange) to save battery and DB load.
 */
export function ChatThread({
  appointmentId,
  viewerRole,
  fetcher,
  poster,
  pollIntervalMs = 10_000,
}: ChatThreadProps) {
  const [items, setItems] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to the latest message whenever the thread grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items.length]);

  // Initial load + polling loop.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function loadOnce() {
      const res = await fetcher(appointmentId);
      if (cancelled) return;
      if (res.ok) {
        setItems(res.data.items);
        setError(null);
      } else {
        setError(res.message);
      }
      setLoading(false);
    }

    function schedule() {
      if (cancelled) return;
      timer = setTimeout(async () => {
        if (document.visibilityState === "visible") {
          await loadOnce();
        }
        schedule();
      }, pollIntervalMs);
    }

    void loadOnce();
    schedule();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [appointmentId, fetcher, pollIntervalMs]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (trimmed.length === 0 || sending) return;
    setSending(true);
    const res = await poster(appointmentId, trimmed);
    setSending(false);
    if (res.ok) {
      setItems(res.data.items);
      setDraft("");
      setError(null);
    } else {
      setError(res.message);
    }
  }

  return (
    <div className="gh-chat-panel flex h-[480px] flex-col">
      <header className="gh-chat-header flex items-center justify-between px-4 py-3">
        <div>
          <h3 className="text-sm font-bold" style={{ color: "var(--portal-text)" }}>Conversation</h3>
          <p className="text-xs" style={{ color: "var(--portal-muted)" }}>
            {viewerRole === "PATIENT"
              ? "Message the clinic team about this booking."
              : "Patient chat — replies show up in their account dashboard."}
          </p>
        </div>
        {loading ? (
          <Loader2 className="size-4 animate-spin" style={{ color: "var(--portal-muted)" }} aria-hidden />
        ) : null}
      </header>

      <div className="gh-chat-body flex-1 overflow-y-auto px-4 py-3">
        {error ? (
          <p className="gh-chat-alert mb-3 rounded-md px-3 py-2 text-xs">
            {error}
          </p>
        ) : null}

        {!loading && items.length === 0 ? (
          <div className="gh-chat-empty rounded-lg px-4 py-5 text-center">
            <Send className="mx-auto size-5" style={{ color: "var(--portal-muted)" }} aria-hidden />
            <p className="mt-2 text-sm font-bold" style={{ color: "var(--portal-text)" }}>
              No messages yet
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs" style={{ color: "var(--portal-muted)" }}>
              Start the conversation below.
            </p>
          </div>
        ) : null}

        <ul className="gh-chat-list space-y-2">
          {items.map((m) => {
            const own = m.authorRole === viewerRole;
            return (
              <li
                key={m.id}
                className={`flex ${own ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`gh-chat-bubble px-3 py-2 text-sm ${
                    own ? "gh-chat-bubble-own" : "gh-chat-bubble-other"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className="mt-1 text-[10px] opacity-80">
                    {formatAppDateTimeShort(m.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmit} className="gh-chat-compose flex items-center gap-2 p-3">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          maxLength={2000}
          className="gh-input flex-1 min-w-0"
        />
        <Btn
          type="submit"
          variant="primary"
          size="sm"
          disabled={sending || draft.trim().length === 0}
          loading={sending}
          iconLeft={<Send className="size-4" aria-hidden />}
          className="gh-chat-send"
        >
          Send
        </Btn>
      </form>
    </div>
  );
}
