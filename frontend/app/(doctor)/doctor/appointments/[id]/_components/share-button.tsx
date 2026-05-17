"use client";

import { useState, useTransition } from "react";
import { Copy, Share2 } from "lucide-react";

/**
 * Share-button for a SIGNED consultation. Calls the backend to mint a
 * fresh token + 7-day expiry, builds an absolute URL using the current
 * origin, and copies it to the clipboard.
 */
export function ShareConsultationButton({
  consultationId,
  disabled,
}: {
  consultationId: string;
  disabled: boolean;
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
        setError(json.message ?? "Could not create share link");
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
      <p className="text-[12px] text-[var(--color-text-muted)]">
        Sign the note to enable a 7-day share link.
      </p>
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
        {pending ? "Generating…" : url ? "Generate another link" : "Share with colleague"}
      </button>
      {url ? (
        <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-background-soft)] px-2 py-1">
          <input
            readOnly
            value={url}
            className="flex-1 bg-transparent text-[12px] font-mono outline-none"
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
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            <Copy className="size-3.5" />
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      ) : null}
      {error ? (
        <p className="gh-status-warning rounded-md border px-3 py-1 text-[12.5px]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
