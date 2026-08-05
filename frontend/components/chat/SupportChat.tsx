"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Loader2, Paperclip, FileText, X } from "lucide-react";
import { formatAppDateTimeShort } from "@/lib/format-datetime";
import { Btn } from "@/components/portal-atoms";
import { groupChatMessages } from "@/lib/chat-grouping";
import { AttachmentPreview } from "@/components/chat/attachment-preview";
import type { SupportMessage } from "@/lib/api/support-chat-api";

export type SupportChatLabels = {
  loadingSr?: string;
  emptyTitle?: string;
  emptyBody?: string;
  placeholder?: string;
  send?: string;
  sendFailed?: string;
  loadFailed?: string;
  attachFileLabel?: string;
  upload?: string;
  uploading?: string;
  uploadFailed?: string;
  removeFileAria?: string;
  attachmentFallback?: string;
  /** Label on the viewing admin's own bubbles. Doctor side never sees it. */
  me?: string;
  pasteHint?: string;
};

type SupportChatProps = {
  /** Which side of the thread is looking. Decides bubble alignment. */
  viewerSide: "DOCTOR" | "ADMIN";
  /**
   * The viewing admin's User id. An ADMIN bubble whose author matches renders
   * as "Me" instead of the admin's first name. Irrelevant on the doctor side.
   */
  viewerUserId?: string | null;
  fetcher: () => Promise<{ items: SupportMessage[] }>;
  poster: (body: string) => Promise<{ items: SupportMessage[] }>;
  fileUploader: (file: File) => Promise<{ items: SupportMessage[] }>;
  initialItems?: SupportMessage[];
  pollIntervalMs?: number;
  labels?: SupportChatLabels;
};

/**
 * Doctor ↔ support (admin team) chat.
 *
 * Unlike `ConsultationChat`, one side of this thread has several people on it,
 * so bubble side can't be derived from author role alone and every admin bubble
 * carries a name. The doctor sees their own messages right and named admin
 * replies left; an admin sees the whole admin team right (their own labelled
 * "Me") and the doctor left.
 *
 * Polling, not sockets — same 10s visibility-gated loop as the other portal
 * chats. Volume doesn't justify a socket layer, and the surface swaps sides
 * purely on props.
 */
export function SupportChat({
  viewerSide,
  viewerUserId,
  fetcher,
  poster,
  fileUploader,
  initialItems,
  pollIntervalMs = 10_000,
  labels,
}: SupportChatProps) {
  const t = {
    loadingSr: labels?.loadingSr ?? "Loading messages…",
    emptyTitle: labels?.emptyTitle ?? "No messages yet.",
    emptyBody:
      labels?.emptyBody ??
      "Describe your issue below — you can attach a screenshot or PDF.",
    placeholder: labels?.placeholder ?? "Type a message…",
    send: labels?.send ?? "Send",
    sendFailed: labels?.sendFailed ?? "Failed to send message",
    loadFailed: labels?.loadFailed ?? "Failed to load messages",
    attachFileLabel: labels?.attachFileLabel ?? "Attach a file (PDF / image)",
    upload: labels?.upload ?? "Upload",
    uploading: labels?.uploading ?? "Uploading…",
    uploadFailed: labels?.uploadFailed ?? "Upload failed",
    removeFileAria: labels?.removeFileAria ?? "Remove file",
    attachmentFallback: labels?.attachmentFallback ?? "Attachment",
    me: labels?.me ?? "Me",
    pasteHint: labels?.pasteHint ?? "You can paste a screenshot straight into the box.",
  };

  const [items, setItems] = useState<SupportMessage[]>(initialItems ?? []);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(!initialItems);
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
      const res = await fetcher();
      setItems(res.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [fetcher, t.loadFailed]);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    // Deferred so setState runs after the effect commit, matching the polling
    // callback path (and react-hooks/set-state-in-effect).
    const bootstrapTimer = setTimeout(() => {
      if (!cancelled) void load();
    }, 0);

    function schedulePoll() {
      if (cancelled) return;
      pollTimer = setTimeout(async () => {
        // Background tabs don't poll — no point burning requests on a thread
        // nobody is looking at.
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
      const res = await poster(trimmed);
      setItems(res.items);
      setDraft("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.sendFailed);
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

  /** Pasted screenshots arrive as a PNG File on the clipboard. Divert them into
   *  the pending-file strip; plain-text pastes fall through untouched. */
  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const file = e.clipboardData?.files?.[0];
    if (!file) return;
    e.preventDefault();
    setPendingFile(file);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    e.target.value = "";
  }

  async function onUpload() {
    if (!pendingFile || uploading) return;
    setUploading(true);
    try {
      const res = await fileUploader(pendingFile);
      setItems(res.items);
      setPendingFile(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.uploadFailed);
    } finally {
      setUploading(false);
    }
  }

  // Group by author IDENTITY, not just role: two different admins replying back
  // to back must stay two runs so both names render.
  const grouped = groupChatMessages(
    items,
    (m) => `${m.authorRole}:${m.authorUserId ?? ""}`,
  );

  return (
    <div className="gh-chat-panel flex flex-col">
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

        {loading && items.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <Loader2
              className="size-5 animate-spin"
              style={{ color: "var(--portal-muted)" }}
              aria-hidden
            />
            <span className="sr-only">{t.loadingSr}</span>
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="gh-chat-empty flex items-center gap-3 rounded-lg px-4 py-3 text-left">
            <Send className="size-4 shrink-0" style={{ color: "var(--portal-muted)" }} aria-hidden />
            <p className="text-xs" style={{ color: "var(--portal-muted)" }}>
              <span className="font-bold" style={{ color: "var(--portal-text)" }}>
                {t.emptyTitle}
              </span>{" "}
              {t.emptyBody}
            </p>
          </div>
        )}

        <ul className="gh-chat-list">
          {grouped.map(({ message: m, grouped: isGrouped, last }) => {
            const own =
              viewerSide === "DOCTOR" ? m.authorRole === "DOCTOR" : m.authorRole === "ADMIN";
            // Doctor's own bubbles need no name. Everything else is named, and
            // the viewing admin's own replies read "Me".
            const authorLabel =
              viewerSide === "DOCTOR"
                ? m.authorRole === "ADMIN"
                  ? m.authorFirstName
                  : null
                : m.authorRole === "ADMIN" && m.authorUserId && m.authorUserId === viewerUserId
                  ? t.me
                  : m.authorFirstName;

            return (
              <li
                key={m.id}
                className={`flex ${own ? "justify-end" : "justify-start"} ${
                  isGrouped ? "gh-chat-list__item--grouped" : ""
                }`}
              >
                <div
                  className={`gh-chat-bubble group px-3 py-2 text-sm ${
                    own ? "gh-chat-bubble-own" : "gh-chat-bubble-other"
                  } ${isGrouped ? "gh-chat-bubble--grouped" : ""}`}
                >
                  {/* Only on the first bubble of a run — repeating the name on
                      every bubble of a burst is noise. */}
                  {authorLabel && !isGrouped ? (
                    <p className="gh-chat-bubble__author">{authorLabel}</p>
                  ) : null}
                  {m.downloadUrl || m.fileName ? (
                    <AttachmentPreview
                      fileName={m.fileName}
                      mimeType={m.mimeType}
                      downloadUrl={m.downloadUrl}
                      own={own}
                      fallbackLabel={t.attachmentFallback}
                    />
                  ) : null}
                  {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
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

      {pendingFile && (
        <div className="gh-chat-pending-file flex items-center gap-3 px-4 py-2">
          <FileText className="size-4 shrink-0" style={{ color: "var(--portal-muted)" }} aria-hidden />
          <span
            className="min-w-0 flex-1 truncate text-sm"
            style={{ color: "var(--portal-text)" }}
            title={pendingFile.name}
          >
            {pendingFile.name}
          </span>
          <button
            type="button"
            onClick={() => setPendingFile(null)}
            className="transition hover:opacity-70"
            style={{ color: "var(--portal-muted)" }}
            aria-label={t.removeFileAria}
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
            {uploading ? t.uploading : t.upload}
          </Btn>
        </div>
      )}

      <form onSubmit={onSend} className="gh-chat-compose flex items-end gap-2 p-3">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.avif"
          className="sr-only"
          onChange={onFileChange}
          aria-label={t.attachFileLabel}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          title={t.attachFileLabel}
          aria-label={t.attachFileLabel}
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
          onPaste={onPaste}
          placeholder={t.placeholder}
          title={t.pasteHint}
          maxLength={4000}
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
          {t.send}
        </Btn>
      </form>
    </div>
  );
}
