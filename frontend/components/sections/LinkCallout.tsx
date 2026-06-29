import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Contextual internal-link callout box (SEO internal-linking spec, Rule 1).
 * A bordered, subtly-tinted box placed where it is clinically relevant —
 * heading + short reason + a single descriptive CTA. Variant accent per link
 * type: UPGRADE (GP→specialist), ENTRY (specialist→GP), REFERRAL, COMPLEMENTARY.
 */
export type LinkCalloutVariant = "UPGRADE" | "ENTRY" | "REFERRAL" | "COMPLEMENTARY";

const ACCENT: Record<LinkCalloutVariant, { border: string; bg: string; label: string }> = {
  UPGRADE: { border: "rgba(29,75,54,0.28)", bg: "rgba(29,75,54,0.05)", label: "Specialist care" },
  ENTRY: { border: "rgba(180,120,10,0.30)", bg: "rgba(180,120,10,0.06)", label: "Start here" },
  REFERRAL: { border: "rgba(27,79,138,0.28)", bg: "rgba(27,79,138,0.05)", label: "Next step" },
  COMPLEMENTARY: { border: "rgba(120,120,120,0.28)", bg: "rgba(120,120,120,0.05)", label: "Related care" },
};

export function LinkCallout({
  variant,
  heading,
  body,
  ctaLabel,
  href,
}: {
  variant: LinkCalloutVariant;
  heading: string;
  body: string | null;
  ctaLabel: string;
  href: string;
}) {
  const accent = ACCENT[variant];
  return (
    <aside
      className="my-6 rounded-[14px] border p-5"
      style={{ borderColor: accent.border, background: accent.bg }}
    >
      <p
        className="m-0 text-[10.5px] font-bold uppercase tracking-[0.18em]"
        style={{ color: "var(--color-brand-primary)" }}
      >
        {accent.label}
      </p>
      <p className="mt-1.5 text-[16px] font-bold text-[var(--color-text-primary)]">{heading}</p>
      {body ? (
        <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--color-text-muted)]">{body}</p>
      ) : null}
      <Link
        href={href}
        className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-bold text-[var(--color-brand-primary)] hover:underline"
      >
        {ctaLabel}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </aside>
  );
}
