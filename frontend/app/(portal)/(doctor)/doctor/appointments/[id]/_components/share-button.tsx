"use client";

import { useState, useTransition } from "react";
import { Copy, Share2 } from "lucide-react";

/**
 * Share-button for a SIGNED consultation. Calls the backend to mint a
 * fresh token + 7-day expiry, builds an absolute URL using the current
 * origin, and copies it to the clipboard.
 */
export type ShareButtonCopy = {
  signNoteHint: string;
  generating: string;
  generateAnother: string;
  shareWithColleague: string;
  copied: string;
  copy: string;
  couldNotCreate: string;
};

export function ShareConsultationButton({
  consultationId,
  disabled,
  copy,
}: {
  consultationId: string;
  disabled: boolean;
  copy: ShareButtonCopy;
}) {
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function mint() {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const res = await fetch(
        `/api/doctor/consultations/${consultationId}/share-link`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ expiresInDays: 7 }),
        },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        data?: { shareLink?: { token: string; expiresAt: string } };
      };
      if (!res.ok || !json.ok || !json.data?.shareLink) {
        setError(json.message ?? copy.couldNotCreate);
        return;
      }
      const built = `${window.location.origin}/share/consults/${json.data.shareLink.token}`;
      setUrl(built);
      try {
        await navigator.clipboard.writeText(built);
        setCopied(true);
      } catch {
        // Clipboard blocked — leave the URL on screen so the doctor can
        // copy it manually.
      }
    });
  }

  if (disabled) {
    return (
      <div className="rounded-md border border-dashed border-[var(--portal-line)] bg-[var(--portal-well)] px-3 py-2">
        <p className="flex items-center gap-2 text-portal-meta font-semibold text-[var(--portal-muted)]">
          <Share2 className="size-3.5" aria-hidden />
          {copy.signNoteHint}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={mint}
        disabled={pending}
        className="gh-btn gh-btn-soft"
      >
        <Share2 className="size-3.5" />
        {pending ? copy.generating : url ? copy.generateAnother : copy.shareWithColleague}
      </button>
      {url ? (
        <div className="flex items-center gap-2 rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] px-2 py-1">
          <input
            readOnly
            value={url}
            className="flex-1 bg-transparent text-portal-meta font-mono outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-focus)] rounded-sm"
            onClick={(e) => e.currentTarget.select()}
          />
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
              } catch {
                /* noop */
              }
            }}
            className="inline-flex items-center gap-1 text-portal-meta font-semibold text-[var(--portal-muted)] hover:text-[var(--portal-text)]"
          >
            <Copy className="size-3.5" />
            {copied ? copy.copied : copy.copy}
          </button>
        </div>
      ) : null}
      {error ? (
        <p className="gh-status-warning rounded-md border px-3 py-1 text-portal-label">
          {error}
        </p>
      ) : null}
    </div>
  );
}
