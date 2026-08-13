"use client";

import { FileText, ImageIcon } from "lucide-react";

/**
 * Attachment chip inside a chat bubble. Shared by every portal chat surface
 * (patient↔doctor consultation chat, doctor↔support chat) so the two can't
 * drift on how a file renders.
 *
 * `own` only picks the colour variant — the caller decides which side of the
 * thread a bubble sits on.
 */
export function AttachmentPreview({
  fileName,
  mimeType,
  downloadUrl,
  own,
  fallbackLabel = "Attachment",
}: {
  fileName: string | null;
  mimeType: string | null;
  downloadUrl: string | null;
  own: boolean;
  fallbackLabel?: string;
}) {
  const isImage = mimeType?.startsWith("image/");
  const label = fileName ?? fallbackLabel;

  // Images render as an actual thumbnail inline (WhatsApp-style) — a filename
  // chip for something the recipient can already see is a wasted tap. The
  // download route is same-origin and cookie-authed, so a plain <img src>
  // works without any signed-URL plumbing.
  if (isImage && downloadUrl) {
    return (
      <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="gh-chat-attachment-image-link">
        {/* eslint-disable-next-line @next/next/no-img-element -- authenticated same-origin route, not a Next-optimizable remote asset */}
        <img src={downloadUrl} alt={label} className="gh-chat-attachment-image" loading="lazy" />
      </a>
    );
  }

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
