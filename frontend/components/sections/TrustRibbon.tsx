/**
 * One-line trust ribbon.
 *
 * Phase 1: data-driven via props. The earlier version hard-coded
 *   "50+ Licensed doctors · 5 Countries · GDPR · 4.94 Doctify rating · 19 reviews"
 * which (a) drifts from the real catalogue and (b) made an unsourced rating
 * claim. Callers should compute the doctor/country counts from the DB and
 * pass a reviews item only when there's a verified source.
 */

export type TrustRibbonItem = { v: string; l: string };

const FALLBACK_ITEMS: TrustRibbonItem[] = [
  { v: "GDPR", l: "Compliant by default" },
];

export function TrustRibbon({ items }: { items?: TrustRibbonItem[] }) {
  const list = items && items.length > 0 ? items : FALLBACK_ITEMS;
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
        {list.map((it) => (
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
