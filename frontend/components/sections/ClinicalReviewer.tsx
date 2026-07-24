import Link from "next/link";
import { BadgeCheck } from "lucide-react";

/**
 * Named clinical-reviewer byline — the E-E-A-T signal blog posts already
 * show ("Clinically reviewed by Dr X"), reused on service pages / about.
 * Renders nothing when there is no real, credentialed reviewer to name —
 * never falls back to a generic "reviewed by licensed doctors" line.
 */
export function ClinicalReviewer({
  label,
  name,
  href,
  credential,
  dark = true,
  reviewedDate,
}: {
  label: string;
  name?: string | null;
  href?: string | null;
  credential?: string | null;
  /** Match the section theme: true = light text on dark hero, false = dark text on ivory. */
  dark?: boolean;
  /** Pre-formatted, already-localized display date (e.g. "24 July 2026").
   *  Caller formats it the same way the blog byline does
   *  (`Date#toLocaleDateString(locale, {day:"numeric",month:"long",year:"numeric"})`)
   *  since this component has no locale context of its own. Renders nothing
   *  when omitted/null — no fabricated "last reviewed" claim. */
  reviewedDate?: string | null;
}) {
  if (!name) return null;
  return (
    <p
      className="mt-4 flex flex-wrap items-center gap-1.5 text-[12.5px] font-medium"
      style={{ color: dark ? "rgba(255,255,255,0.6)" : "var(--color-text-muted)" }}
    >
      <BadgeCheck
        className="size-3.5 shrink-0"
        style={{ color: "var(--color-brand-accent)" }}
        aria-hidden
      />
      {label}{" "}
      {href ? (
        <Link
          href={href}
          className="gh-focus-on-dark underline decoration-[rgba(176,241,34,0.5)] underline-offset-2 transition-colors hover:text-[var(--color-brand-accent)]"
          style={{ color: dark ? "rgba(255,255,255,0.85)" : "var(--color-text-primary)" }}
        >
          {name}
        </Link>
      ) : (
        <span style={{ color: dark ? "rgba(255,255,255,0.85)" : "var(--color-text-primary)" }}>{name}</span>
      )}
      {credential ? <span style={{ opacity: 0.7 }}>· {credential}</span> : null}
      {reviewedDate ? (
        <span
          className="ml-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
          style={{
            borderColor: dark ? "rgba(255,255,255,0.16)" : "rgba(29,75,54,0.16)",
            color: dark ? "rgba(255,255,255,0.7)" : "var(--color-text-muted)",
          }}
        >
          {reviewedDate}
        </span>
      ) : null}
    </p>
  );
}
