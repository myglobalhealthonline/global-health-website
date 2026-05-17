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

type ViewerRole = "PATIENT" | "DOCTOR";

type ConsultationChatProps = {
  appointmentId: string;
  viewerRole: ViewerRole;
  /** Initial lock state (pass from parent on first render). */
  initialChatLocked?: boolean;
  fetcher: (id: string) => Promise<{ items: ChatMessage[]; chatLocked: boolean }>;
  poster: (id: string, body: string) => Promise<{ items: ChatMessage[]; chatLocked: boolean }>;
  fileUploader: (id: string, file: File) => Promise<{ items: ChatMessage[]; chatLocked: boolean }>;
  /** Doctor-only: toggle chat open/closed. */
  onToggleLock?: (open: boolean) => Promise<{ chatLocked: boolean }>;
  pollIntervalMs?: number;
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
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
        own
          ? "border-emerald-500 bg-emerald-600 text-white"
          : "border-slate-200 bg-white text-slate-700"
      }`}
    >
      {isImage ? (
        <ImageIcon className="size-4 shrink-0" aria-hidden />
      ) : (
        <FileText className="size-4 shrink-0" aria-hidden />
      )}
      <span className="max-w-[200px] truncate">{label}</span>
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
}: ConsultationChatProps) {
  const [items, setItems] = useState<ChatMessage[]>([]);
  const [chatLocked, setChatLocked] = useState(initialChatLocked);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [togglingLock, setTogglingLock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items.length]);

  const load = useCallback(async () => {
    try {
      const res = await fetcher(appointmentId);
      setItems(res.items);
      setChatLocked(res.chatLocked);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [appointmentId, fetcher]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    void load();

    function schedule() {
      if (cancelled) return;
      timer = setTimeout(async () => {
        if (document.visibilityState === "visible" && !cancelled) {
          await load();
        }
        schedule();
      }, pollIntervalMs);
    }
    schedule();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
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
      setDraft("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
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

  const canSend = viewerRole === "DOCTOR" || !chatLocked;

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            {viewerRole === "PATIENT" ? "Chat with your doctor" : "Patient chat"}
          </h3>
          <p className="text-xs text-slate-500">
            {viewerRole === "PATIENT"
              ? "Send messages or upload documents for your doctor to review."
              : "Messages and files from the patient. You can lock or re-open the chat window."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {loading && <Loader2 className="size-4 animate-spin text-slate-400" aria-hidden />}
          {viewerRole === "DOCTOR" && onToggleLock && (
            <button
              type="button"
              onClick={handleToggleLock}
              disabled={togglingLock}
              title={chatLocked ? "Re-open chat for patient" : "Lock chat (patient cannot reply)"}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
                chatLocked
                  ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {chatLocked ? (
                <>
                  <Unlock className="size-3.5" aria-hidden /> Re-open
                </>
              ) : (
                <>
                  <Lock className="size-3.5" aria-hidden /> Lock
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Lock banner for patients */}
      {chatLocked && viewerRole === "PATIENT" && (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <Lock className="size-4 shrink-0" aria-hidden />
          Chat window closed. Contact your doctor to re-open.
        </div>
      )}

      {/* Message list */}
      <div className="h-[400px] flex-1 overflow-y-auto px-4 py-3">
        {error && (
          <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}

        {!loading && items.length === 0 && (
          <p className="text-sm text-slate-500">
            No messages yet.{" "}
            {canSend
              ? "Start the conversation below or attach a document."
              : "The chat window is currently closed."}
          </p>
        )}

        <ul className="space-y-2">
          {items.map((m) => {
            const own = m.authorRole === viewerRole;
            return (
              <li key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    own
                      ? "bg-emerald-700 text-white"
                      : "border border-slate-200 bg-slate-50 text-slate-800"
                  }`}
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

      {/* Pending file preview */}
      {pendingFile && (
        <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50 px-4 py-2">
          <FileText className="size-4 shrink-0 text-slate-500" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
            {pendingFile.name}
          </span>
          <button
            type="button"
            onClick={() => setPendingFile(null)}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Remove file"
          >
            <X className="size-4" />
          </button>
          <button
            type="button"
            onClick={onUpload}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : null}
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>
      )}

      {/* Compose area */}
      {canSend ? (
        <form
          onSubmit={onSend}
          className="flex items-center gap-2 border-t border-slate-100 p-3"
        >
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
            className="shrink-0 rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <Paperclip className="size-4" aria-hidden />
          </button>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message…"
            maxLength={2000}
            className="gh-input min-w-0 flex-1"
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
      ) : (
        <div className="border-t border-slate-100 px-4 py-3 text-center text-xs text-slate-400">
          Chat is closed. Only your doctor can re-open it.
        </div>
      )}
    </div>
  );
}
