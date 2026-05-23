"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Video } from "lucide-react";

type Props = {
  orderId: string;
  meetingUrl: string | null;
  hasConsultation: boolean;
  variant?: "cell" | "panel";
};

export function OrderMeetLinkActions({
  orderId,
  meetingUrl,
  hasConsultation,
  variant = "cell",
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState(meetingUrl);

  if (!hasConsultation) {
    return variant === "cell" ? (
      <span className="text-xs text-[var(--color-text-muted)]">—</span>
    ) : null;
  }

  async function generateLink() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/orders/${orderId}/generate-meet-link`, {
        method: "POST",
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        data?: { meetLink?: string; meetingUrl?: string };
      };
      if (!res.ok || !json?.ok) {
        setError(json?.message ?? "Failed to generate Meet link");
        return;
      }
      const nextLink = json.data?.meetLink ?? json.data?.meetingUrl ?? null;
      if (nextLink) setLink(nextLink);
      router.refresh();
    });
  }

  if (variant === "cell") {
    return (
      <div className="flex min-w-[140px] flex-col gap-1">
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-brand-primary)] hover:underline"
            title={link}
          >
            <ExternalLink className="size-3 shrink-0" aria-hidden />
            Join Meet
          </a>
        ) : (
          <span className="text-xs text-[var(--color-text-muted)]">None</span>
        )}
        <button
          type="button"
          onClick={() => void generateLink()}
          disabled={pending}
          className="inline-flex w-fit items-center gap-1 rounded border border-[var(--color-border)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="size-3 animate-spin" aria-hidden />
          ) : (
            <Video className="size-3" aria-hidden />
          )}
          {link ? "Regenerate" : "Generate"}
        </button>
        {error ? <span className="text-[10px] text-rose-700">{error}</span> : null}
      </div>
    );
  }

  return (
    <div className="grid gap-3 p-5 text-sm">
      {link ? (
        <p>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 break-all font-semibold text-[var(--color-brand-primary)] hover:underline"
          >
            <ExternalLink className="size-3.5 shrink-0" aria-hidden />
            {link}
          </a>
        </p>
      ) : (
        <p className="text-[var(--color-text-muted)]">No Meet link yet.</p>
      )}

      <button
        type="button"
        onClick={() => void generateLink()}
        disabled={pending}
        className="inline-flex w-fit items-center gap-1.5 rounded-md bg-[var(--color-brand-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-3 animate-spin" aria-hidden />
        ) : (
          <Video className="size-3" aria-hidden />
        )}
        {link ? "Regenerate Meet link" : "Generate Meet link"}
      </button>

      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
