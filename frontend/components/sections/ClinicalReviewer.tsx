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
}: {
  label: string;
  name?: string | null;
  href?: string | null;
  credential?: string | null;
  /** Match the section theme: true = light text on dark hero, false = dark text on ivory. */
  dark?: boolean;
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
    </p>
  );
}
