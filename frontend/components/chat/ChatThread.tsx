"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import type { ChatMessage } from "@/lib/api/chat-api";

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
    <div className="flex h-[480px] flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Conversation</h3>
          <p className="text-xs text-slate-500">
            {viewerRole === "PATIENT"
              ? "Message the clinic team about this booking."
              : "Patient chat — replies show up in their account dashboard."}
          </p>
        </div>
        {loading ? (
          <Loader2 className="size-4 animate-spin text-slate-400" aria-hidden />
        ) : null}
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {error ? (
          <p className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {error}
          </p>
        ) : null}

        {!loading && items.length === 0 ? (
          <p className="text-sm text-slate-500">
            No messages yet. Start the conversation below.
          </p>
        ) : null}

        <ul className="space-y-2">
          {items.map((m) => {
            const own = m.authorRole === viewerRole;
            return (
              <li
                key={m.id}
                className={`flex ${own ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    own
                      ? "bg-emerald-700 text-white"
                      : "border border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      own ? "text-emerald-100" : "text-slate-500"
                    }`}
                  >
                    {new Date(m.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        <div ref={endRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 border-t border-slate-100 p-3"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          maxLength={2000}
          className="gh-input flex-1 min-w-0"
        />
        <button
          type="submit"
          disabled={sending || draft.trim().length === 0}
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
        >
          <Send className="size-4" aria-hidden />
          {sending ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}
