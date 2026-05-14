import Link from "next/link";
import { ExternalLink, Info } from "lucide-react";

/**
 * Banner shown on entity edit pages with a "live preview" link to the public URL.
 * Public site is a stub right now — clicking lands on coming-soon. Phase 8 will
 * make these links real.
 */
export function LivePreview({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card-sm)] border border-dashed border-[var(--color-border-strong)] px-4 py-3 text-sm"
      style={{ background: "var(--color-background-soft)" }}
    >
      <div className="flex items-start gap-3">
        <Info
          className="size-4 shrink-0 text-[var(--color-brand-primary)]"
          aria-hidden
        />
        <div>
          <p className="font-semibold text-[var(--color-text-primary)]">
            Public URL
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {label} · Public site is in rebuild — link opens placeholder until
            the public rebuild lands.
          </p>
        </div>
      </div>
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--color-brand-primary)] transition hover:border-[var(--color-border-strong)]"
      >
        <code className="font-mono">{href}</code>
        <ExternalLink className="size-3" aria-hidden />
      </Link>
    </div>
  );
}
