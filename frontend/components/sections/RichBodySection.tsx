/**
 * Public-side renderer for the rich-text `body` field on a ContentPage.
 *
 * The admin editor sanitizes HTML before saving (strips scripts, drops
 * disallowed attributes, narrows inline styles to a safe list) so the DB
 * value is render-safe. We still scope the HTML to a `prose`-style wrapper
 * with conservative styling defaults.
 *
 * Renders `null` when the body is empty so we don't show a stray spacer.
 */

export function RichBodySection({
  html,
  eyebrow,
  maxWidth = 720,
}: {
  html: string | null | undefined;
  /** Optional small label above the body, e.g. "What you should know". */
  eyebrow?: string;
  /** Constrain the prose column for readability. */
  maxWidth?: number;
}) {
  const trimmed = (html ?? "").trim();
  if (!trimmed || trimmed === "<p><br/></p>" || trimmed === "<p><br></p>") {
    return null;
  }
  return (
    <section style={{ padding: "48px 0" }}>
      <div
        className="mx-auto"
        style={{
          maxWidth,
          padding: "0 clamp(20px, 4vw, 32px)",
        }}
      >
        {eyebrow ? (
          <p
            className="uppercase"
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.18em",
              color: "var(--color-brand-primary)",
              margin: 0,
            }}
          >
            {eyebrow}
          </p>
        ) : null}
        <article
          className="gh-rich-body mt-4 text-[var(--color-text-body)]"
          style={{ fontSize: 16, lineHeight: 1.7 }}
          dangerouslySetInnerHTML={{ __html: trimmed }}
        />
      </div>
      {/* Conservative prose defaults — the editor's allowed tags are
          h2/h3/p/ul/ol/li/strong/em/u/a/span/font. */}
      <style>{`
        .gh-rich-body h2 {
          font-family: var(--font-display);
          font-size: clamp(24px, 3vw, 32px);
          font-weight: 800;
          letter-spacing: -0.015em;
          line-height: 1.2;
          margin: 32px 0 12px;
          color: var(--color-text-primary);
        }
        .gh-rich-body h3 {
          font-family: var(--font-display);
          font-size: clamp(18px, 2vw, 22px);
          font-weight: 800;
          letter-spacing: -0.01em;
          line-height: 1.3;
          margin: 24px 0 8px;
          color: var(--color-text-primary);
        }
        .gh-rich-body p { margin: 12px 0; }
        .gh-rich-body ul, .gh-rich-body ol { margin: 12px 0 12px 24px; padding: 0; }
        .gh-rich-body li { margin: 6px 0; }
        .gh-rich-body a { color: var(--color-brand-primary); text-decoration: underline; }
        .gh-rich-body strong { font-weight: 700; }
        .gh-rich-body em { font-style: italic; }
        .gh-rich-body u { text-decoration: underline; }
        .gh-rich-body img { max-width: 100%; height: auto; }
      `}</style>
    </section>
  );
}
