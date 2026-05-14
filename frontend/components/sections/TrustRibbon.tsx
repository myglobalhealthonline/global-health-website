/**
 * One-line trust ribbon — not a 4-card grid.
 * Matches `ui_kits/website/Sections.jsx TrustRibbon`.
 */

const ITEMS = [
  { v: "50+", l: "Licensed doctors" },
  { v: "5", l: "Countries · EU-registered" },
  { v: "GDPR", l: "Compliant by default" },
  { v: "4.94", l: "Doctify rating · 19 reviews" },
];

export function TrustRibbon() {
  return (
    <section
      style={{
        background: "var(--color-background-soft)",
        borderTop: "1px solid var(--color-border)",
        borderBottom: "1px solid var(--color-border)",
        padding: "20px 0",
      }}
    >
      <div
        className="mx-auto flex flex-wrap justify-between gap-4"
        style={{
          maxWidth: 1320,
          padding: "0 clamp(20px, 4vw, 40px)",
        }}
      >
        {ITEMS.map((it) => (
          <div
            key={it.l}
            className="inline-flex items-baseline gap-3"
            style={{ flex: "1 1 200px" }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 28,
                fontWeight: 800,
                color: "var(--color-brand-primary)",
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              {it.v}
            </span>
            <span
              style={{
                fontSize: 13,
                color: "var(--color-text-muted)",
                fontWeight: 600,
              }}
            >
              {it.l}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
