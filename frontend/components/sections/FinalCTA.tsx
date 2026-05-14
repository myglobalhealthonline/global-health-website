/**
 * Minimal closer CTA — "Same care. Less waiting."
 * Matches `ui_kits/website/Sections.jsx FinalCTA`.
 */

import Link from "next/link";

export function FinalCTA({
  primaryHref = "/book-online",
  secondaryHref = "/plans-pricing",
}: {
  primaryHref?: string;
  secondaryHref?: string;
}) {
  return (
    <section
      style={{
        padding: "96px 0",
        background: "var(--color-background-soft)",
      }}
    >
      <div
        className="mx-auto text-center"
        style={{
          maxWidth: 920,
          padding: "0 clamp(20px, 4vw, 40px)",
        }}
      >
        <h2
          className="m-0 text-[var(--color-text-primary)]"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(40px, 6vw, 80px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 0.95,
          }}
        >
          Same care.{" "}
          <span style={{ color: "var(--color-brand-primary)" }}>
            Less waiting.
          </span>
        </h2>
        <p
          className="mx-auto text-[var(--color-text-muted)]"
          style={{
            marginTop: 24,
            fontSize: 19,
            lineHeight: 1.5,
            maxWidth: "44ch",
          }}
        >
          You&apos;ll be on a video call with a registered doctor in under an
          hour, most days.
        </p>
        <div
          className="flex flex-wrap justify-center gap-3"
          style={{ marginTop: 36 }}
        >
          <Link
            href={primaryHref}
            className="gh-btn gh-btn-primary"
            style={{ minHeight: 52, padding: "0 28px", fontSize: 14 }}
          >
            Book a consultation
          </Link>
          <Link
            href={secondaryHref}
            className="gh-btn gh-btn-outline"
            style={{ minHeight: 52, padding: "0 28px", fontSize: 14 }}
          >
            See full pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
