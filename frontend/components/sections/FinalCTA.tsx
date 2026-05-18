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
      className="gh-medical-pattern gh-medical-pattern-dark"
      style={{
        padding: "112px 0",
        background: "var(--color-brand-primary)",
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
          className="m-0"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(40px, 6vw, 80px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 0.95,
            color: "#ffffff",
          }}
        >
          Same care.{" "}
          <span style={{ color: "var(--color-accent)" }}>
            Less waiting.
          </span>
        </h2>
        <p
          className="mx-auto"
          style={{
            marginTop: 28,
            fontSize: 19,
            lineHeight: 1.55,
            maxWidth: "44ch",
            color: "rgba(255,255,255,0.80)",
          }}
        >
          You&apos;ll be on a video call with a registered doctor in under an
          hour, most days.
        </p>
        <div
          className="flex flex-wrap justify-center gap-3"
          style={{ marginTop: 40 }}
        >
          <Link
            href={primaryHref}
            className="gh-btn gh-btn-ghost-dark"
            style={{ minHeight: 52, padding: "0 28px", fontSize: 14 }}
          >
            Book a consultation
          </Link>
          <Link
            href={secondaryHref}
            className="gh-btn"
            style={{
              minHeight: 52,
              padding: "0 28px",
              fontSize: 14,
              border: "1px solid rgba(255,255,255,0.35)",
              background: "transparent",
              color: "rgba(255,255,255,0.90)",
            }}
          >
            See full pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
