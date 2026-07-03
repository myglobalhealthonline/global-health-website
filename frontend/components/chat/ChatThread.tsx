"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import type { ChatMessage } from "@/lib/api/chat-api";
import { formatAppDateTimeShort } from "@/lib/format-datetime";
import { Btn } from "@/components/portal-atoms";
import { groupChatMessages } from "@/lib/chat-grouping";

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
  /** "panel" (default) renders its own card chrome + header — for inline
   *  placement. "embedded" drops both (the header text/subtitle is lost —
   *  pass it via a PortalDialog title instead) for use inside a dialog. */
  variant?: "panel" | "embedded";
  /** When set, replaces the composer with a plain-language reason instead
   *  of the input (DESIGN.md §7 states matrix — disabled chat composer). */
  disabledReason?: string | null;
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
  variant = "panel",
  disabledReason = null,
}: ChatThreadProps) {
  const [items, setItems] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      setError(null);
    } else {
      setError(res.message);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  function onDraftChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDraft(e.target.value);
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  const grouped = groupChatMessages(items);
  const panelClass = variant === "embedded" ? "gh-chat-panel-embedded" : "gh-chat-panel";

  return (
    <div className={`${panelClass} flex flex-col`}>
      {variant === "panel" ? (
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
      ) : null}

      <div className="gh-chat-body flex-1 min-h-0 overflow-y-auto px-4 py-3">
        {error ? (
          <p className="gh-chat-alert mb-3 rounded-md px-3 py-2 text-xs">
            {error}
          </p>
        ) : null}

        {!loading && items.length === 0 ? (
          <div className="gh-chat-empty flex items-center gap-3 rounded-lg px-4 py-3 text-left">
            <Send className="size-4 shrink-0" style={{ color: "var(--portal-muted)" }} aria-hidden />
            <p className="text-xs" style={{ color: "var(--portal-muted)" }}>
              <span className="font-bold" style={{ color: "var(--portal-text)" }}>No messages yet.</span>{" "}
              Start the conversation below.
            </p>
          </div>
        ) : null}

        <ul className="gh-chat-list">
          {grouped.map(({ message: m, grouped: isGrouped, last }) => {
            const own = m.authorRole === viewerRole;
            return (
              <li
                key={m.id}
                className={`flex ${own ? "justify-end" : "justify-start"} ${isGrouped ? "gh-chat-list__item--grouped" : ""}`}
              >
                <div
                  className={`gh-chat-bubble group px-3 py-2 text-sm ${
                    own ? "gh-chat-bubble-own" : "gh-chat-bubble-other"
                  } ${isGrouped ? "gh-chat-bubble--grouped" : ""}`}
                >
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p
                    className={`gh-chat-bubble__time mt-1 text-[10px] opacity-80 ${
                      last ? "" : "gh-chat-bubble__time--hover-only"
                    }`}
                  >
                    {formatAppDateTimeShort(m.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        <div ref={endRef} />
      </div>

      {disabledReason ? (
        <div className="gh-chat-disabled px-4 py-3 text-center text-xs font-medium" style={{ color: "var(--portal-muted)" }}>
          {disabledReason}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="gh-chat-compose flex items-end gap-2 p-3">
          <textarea
            ref={textareaRef}
            rows={1}
            value={draft}
            onChange={onDraftChange}
            onKeyDown={onKeyDown}
            placeholder="Type a message…"
            maxLength={2000}
            className="gh-input gh-chat-textarea flex-1 min-w-0"
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
      )}
    </div>
  );
}
