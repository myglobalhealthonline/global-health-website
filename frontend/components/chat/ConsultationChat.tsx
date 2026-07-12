"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Send,
  Loader2,
  Paperclip,
  Lock,
  Unlock,
  FileText,
  ImageIcon,
  X,
} from "lucide-react";
import type { ChatMessage } from "@/lib/api/consultation-chat-api";
import { formatAppDateTimeShort } from "@/lib/format-datetime";
import { Btn } from "@/components/portal-atoms";
import { groupChatMessages } from "@/lib/chat-grouping";

type ViewerRole = "PATIENT" | "DOCTOR";

type ConsultationChatProps = {
  appointmentId: string;
  viewerRole: ViewerRole;
  /** Initial lock state (pass from parent on first render). */
  initialChatLocked?: boolean;
  fetcher: (id: string) => Promise<{ items: ChatMessage[]; chatLocked: boolean; paymentRequired: boolean }>;
  poster: (id: string, body: string) => Promise<{ items: ChatMessage[]; chatLocked: boolean; paymentRequired: boolean }>;
  fileUploader: (id: string, file: File) => Promise<{ items: ChatMessage[]; chatLocked: boolean; paymentRequired: boolean }>;
  /** Doctor-only: toggle chat open/closed. */
  onToggleLock?: (open: boolean) => Promise<{ chatLocked: boolean }>;
  pollIntervalMs?: number;
  /** "panel" (default) renders its own card chrome + header — for inline
   *  placement. "embedded" drops both for use inside a dialog (the lock
   *  toggle still renders — thread it through the dialog title/footer if
   *  a caller needs it visible while embedded). */
  variant?: "panel" | "embedded";
};

function AttachmentPreview({
  fileName,
  mimeType,
  downloadUrl,
  own,
}: {
  fileName: string | null;
  mimeType: string | null;
  downloadUrl: string | null;
  own: boolean;
}) {
  const isImage = mimeType?.startsWith("image/");
  const label = fileName ?? "Attachment";

  const inner = (
    <div
      className={`gh-chat-attachment flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
        own ? "gh-chat-attachment-own" : "gh-chat-attachment-other"
      }`}
    >
      {isImage ? (
        <ImageIcon className="size-4 shrink-0" aria-hidden />
      ) : (
        <FileText className="size-4 shrink-0" aria-hidden />
      )}
      <span className="max-w-[200px] truncate" title={label}>{label}</span>
    </div>
  );

  if (downloadUrl) {
    return (
      <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }
  return inner;
}

export function ConsultationChat({
  appointmentId,
  viewerRole,
  initialChatLocked = false,
  fetcher,
  poster,
  fileUploader,
  onToggleLock,
  pollIntervalMs = 10_000,
  variant = "panel",
}: ConsultationChatProps) {
  const [items, setItems] = useState<ChatMessage[]>([]);
  const [chatLocked, setChatLocked] = useState(initialChatLocked);
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [togglingLock, setTogglingLock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items.length]);

  const load = useCallback(async () => {
    try {
      const res = await fetcher(appointmentId);
      setItems(res.items);
      setChatLocked(res.chatLocked);
      setPaymentRequired(res.paymentRequired);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [appointmentId, fetcher]);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    // Defer the first fetch so setState runs after the effect commit (avoids
    // react-hooks/set-state-in-effect and matches the polling callback path).
    const bootstrapTimer = setTimeout(() => {
      if (!cancelled) void load();
    }, 0);

    function schedulePoll() {
      if (cancelled) return;
      pollTimer = setTimeout(async () => {
        if (document.visibilityState === "visible" && !cancelled) {
          await load();
        }
        schedulePoll();
      }, pollIntervalMs);
    }
    schedulePoll();

    return () => {
      cancelled = true;
      clearTimeout(bootstrapTimer);
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [load, pollIntervalMs]);

  async function onSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (trimmed.length === 0 || sending) return;
    setSending(true);
    try {
      const res = await poster(appointmentId, trimmed);
      setItems(res.items);
      setChatLocked(res.chatLocked);
      setPaymentRequired(res.paymentRequired);
      setDraft("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
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

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    e.target.value = "";
  }

  async function onUpload() {
    if (!pendingFile || uploading) return;
    setUploading(true);
    try {
      const res = await fileUploader(appointmentId, pendingFile);
      setItems(res.items);
      setChatLocked(res.chatLocked);
      setPaymentRequired(res.paymentRequired);
      setPendingFile(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleToggleLock() {
    if (!onToggleLock || togglingLock) return;
    setTogglingLock(true);
    try {
      const res = await onToggleLock(chatLocked);
      setChatLocked(res.chatLocked);
    } catch {
      // noop — UI stays as-is
    } finally {
      setTogglingLock(false);
    }
  }

  const canSend =
    !paymentRequired && (viewerRole === "DOCTOR" || !chatLocked);
  const grouped = groupChatMessages(items);
  const panelClass = variant === "embedded" ? "gh-chat-panel-embedded" : "gh-chat-panel";
  const lockToggle =
    viewerRole === "DOCTOR" && onToggleLock && !paymentRequired ? (
      <Btn
        type="button"
        variant={chatLocked ? "soft" : "secondary"}
        size="sm"
        onClick={handleToggleLock}
        disabled={togglingLock}
        title={chatLocked ? "Re-open chat for patient" : "Lock chat (patient cannot reply)"}
        iconLeft={
          chatLocked ? (
            <Unlock className="size-3.5" aria-hidden />
          ) : (
            <Lock className="size-3.5" aria-hidden />
          )
        }
        className="gh-chat-lock-button"
      >
        {chatLocked ? "Re-open" : "Lock"}
      </Btn>
    ) : null;

  return (
    <div className={`${panelClass} flex flex-col`}>
      {variant === "panel" ? (
        <header className="gh-chat-header flex items-center justify-between px-4 py-3">
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--portal-text)" }}>
              {viewerRole === "PATIENT" ? "Chat with your doctor" : "Patient chat"}
            </h3>
            <p className="text-xs" style={{ color: "var(--portal-muted)" }}>
              {viewerRole === "PATIENT"
                ? "Send messages or upload documents for your doctor to review."
                : "Messages and files from the patient. You can lock or re-open the chat window."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {loading && <Loader2 className="size-4 animate-spin" style={{ color: "var(--portal-muted)" }} aria-hidden />}
            {lockToggle}
          </div>
        </header>
      ) : (
        lockToggle ? (
          <div className="gh-chat-header gh-chat-header--embedded flex items-center justify-end px-4 py-2">
            {lockToggle}
          </div>
        ) : null
      )}

      {/* Payment required banner — takes priority over lock banner */}
      {paymentRequired && (
        <div className="gh-chat-alert flex items-center gap-2 px-4 py-2.5 text-sm">
          <Lock className="size-4 shrink-0" aria-hidden />
          {viewerRole === "PATIENT"
            ? "Complete payment to start chatting with your doctor."
            : "Patient has not completed payment — chat is unavailable until the booking is paid."}
        </div>
      )}

      {/* Lock banner for patients */}
      {!paymentRequired && chatLocked && viewerRole === "PATIENT" && (
        <div className="gh-chat-alert flex items-center gap-2 px-4 py-2.5 text-sm">
          <Lock className="size-4 shrink-0" aria-hidden />
          Chat window closed. Contact your doctor to re-open.
        </div>
      )}

      {/* Message list */}
      <div className="gh-chat-body flex-1 min-h-0 overflow-y-auto px-4 py-3">
        {error && (
          <p
            className="mb-3 rounded-md px-3 py-2 text-xs"
            style={{
              border: "1px solid var(--portal-danger)",
              background: "var(--portal-danger-soft)",
              color: "var(--portal-danger-text)",
            }}
          >
            {error}
          </p>
        )}

        {!loading && items.length === 0 && (
          <div className="gh-chat-empty flex items-center gap-3 rounded-lg px-4 py-3 text-left">
            <Send className="size-4 shrink-0" style={{ color: "var(--portal-muted)" }} aria-hidden />
            <p className="text-xs" style={{ color: "var(--portal-muted)" }}>
              <span className="font-bold" style={{ color: "var(--portal-text)" }}>No messages yet.</span>{" "}
              {canSend
                ? "Start the conversation below or attach a document."
                : "The chat window is currently closed."}
            </p>
          </div>
        )}

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
                  {m.downloadUrl || m.fileName ? (
                    <AttachmentPreview
                      fileName={m.fileName}
                      mimeType={m.mimeType}
                      downloadUrl={m.downloadUrl}
                      own={own}
                    />
                  ) : null}
                  {m.body && (
                    <p className="whitespace-pre-wrap">{m.body}</p>
                  )}
                  <p
                    className={`gh-chat-bubble__time mt-1 text-portal-micro opacity-80 ${
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

      {/* Pending file preview */}
      {pendingFile && (
        <div className="gh-chat-pending-file flex items-center gap-3 px-4 py-2">
          <FileText className="size-4 shrink-0" style={{ color: "var(--portal-muted)" }} aria-hidden />
          <span className="min-w-0 flex-1 truncate text-sm" style={{ color: "var(--portal-text)" }} title={pendingFile.name}>
            {pendingFile.name}
          </span>
          <button
            type="button"
            onClick={() => setPendingFile(null)}
            className="transition hover:opacity-70"
            style={{ color: "var(--portal-muted)" }}
            aria-label="Remove file"
          >
            <X className="size-4" />
          </button>
          <Btn
            type="button"
            variant="primary"
            size="sm"
            onClick={onUpload}
            disabled={uploading}
            loading={uploading}
          >
            {uploading ? "Uploading…" : "Upload"}
          </Btn>
        </div>
      )}

      {/* Compose area */}
      {canSend ? (
        <form onSubmit={onSend} className="gh-chat-compose flex items-end gap-2 p-3">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="sr-only"
            onChange={onFileChange}
            aria-label="Attach file"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title="Attach a file (PDF / image)"
            aria-label="Attach a file (PDF / image)"
            className="gh-chat-attach shrink-0 rounded-md p-2 transition hover:bg-[var(--portal-well)]"
            style={{ color: "var(--portal-muted)" }}
          >
            <Paperclip className="size-4" aria-hidden />
          </button>
          <textarea
            ref={textareaRef}
            rows={1}
            value={draft}
            onChange={onDraftChange}
            onKeyDown={onKeyDown}
            placeholder="Type a message…"
            maxLength={2000}
            className="gh-input gh-chat-textarea min-w-0 flex-1"
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
      ) : (
        <div className="gh-chat-disabled px-4 py-3 text-center text-xs font-medium" style={{ color: "var(--portal-muted)" }}>
          {paymentRequired
            ? viewerRole === "PATIENT"
              ? "Complete your booking payment to unlock the chat."
              : "Patient has not completed payment yet."
            : "Chat is closed. Only your doctor can re-open it."}
        </div>
      )}
    </div>
  );
}
