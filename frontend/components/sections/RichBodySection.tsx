/**
 * Public-side renderer for the rich-text `body` field on a ContentPage.
 *
 * Dark luxury version — forest-night canvas, white/80 prose text.
 * HTML is sanitized at render time (server component) so a payload that
 * slipped past the admin editor can never execute in a visitor's browser.
 */
import { sanitizePageBodyHtml } from "@/lib/content/sanitize-page-body";

export function RichBodySection({
  html,
  eyebrow,
  maxWidth = 720,
  theme = "dark",
}: {
  html: string | null | undefined;
  eyebrow?: string;
  maxWidth?: number;
  theme?: "dark" | "light";
}) {
  const trimmed = (html ?? "").trim();
  if (!trimmed || trimmed === "<p><br/></p>" || trimmed === "<p><br></p>") {
    return null;
  }

  const safeHtml = sanitizePageBodyHtml(trimmed);
  if (!safeHtml) {
    return null;
  }

  const isLight = theme === "light";

  return (
    <section
      className={
        isLight
          ? "relative overflow-hidden gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel"
          : "relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark gh2-section-forest"
      }
      style={{
        padding: "clamp(40px,5vw,64px) 0",
        borderTop: isLight
          ? "1px solid rgba(29,75,54,0.10)"
          : "1px solid rgba(255,255,255,0.06)",
      }}
    >
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
              letterSpacing: "0.20em",
              color: isLight ? "var(--color-brand-primary)" : "var(--color-brand-accent)",
              marginBottom: 16,
            }}
          >
            {eyebrow}
          </p>
        ) : null}
        <article
          className={isLight ? "gh-rich-body-light mt-4" : "gh-rich-body-dark mt-4"}
          style={{
            fontSize: 16,
            lineHeight: 1.75,
            color: isLight ? "var(--color-text-body)" : "rgba(255,255,255,0.72)",
          }}
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      </div>

      <style>{`
        .gh-rich-body-dark h2 {
          font-family: var(--font-display);
          font-size: clamp(22px, 3vw, 30px);
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1.15;
          margin: 36px 0 14px;
          color: rgba(255,255,255,0.92);
        }
        .gh-rich-body-dark h3 {
          font-family: var(--font-display);
          font-size: clamp(17px, 2vw, 21px);
          font-weight: 700;
          letter-spacing: -0.01em;
          line-height: 1.3;
          margin: 28px 0 10px;
          color: rgba(255,255,255,0.88);
        }
        .gh-rich-body-dark p { margin: 14px 0; }
        .gh-rich-body-dark ul, .gh-rich-body-dark ol { margin: 14px 0 14px 24px; padding: 0; }
        .gh-rich-body-dark li { margin: 8px 0; }
        .gh-rich-body-dark a {
          color: var(--color-brand-accent);
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .gh-rich-body-dark strong { font-weight: 700; color: rgba(255,255,255,0.88); }
        .gh-rich-body-dark em { font-style: italic; }
        .gh-rich-body-dark u { text-decoration: underline; }
        .gh-rich-body-dark img { max-width: 100%; height: auto; border-radius: 12px; }

        .gh-rich-body-light h2 {
          font-family: var(--font-display);
          font-size: clamp(22px, 3vw, 30px);
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1.15;
          margin: 36px 0 14px;
          color: var(--color-text-primary);
        }
        .gh-rich-body-light h3 {
          font-family: var(--font-display);
          font-size: clamp(17px, 2vw, 21px);
          font-weight: 700;
          letter-spacing: -0.01em;
          line-height: 1.3;
          margin: 28px 0 10px;
          color: var(--color-text-primary);
        }
        .gh-rich-body-light p { margin: 14px 0; }
        .gh-rich-body-light ul, .gh-rich-body-light ol { margin: 14px 0 14px 24px; padding: 0; }
        .gh-rich-body-light li { margin: 8px 0; }
        .gh-rich-body-light a {
          color: var(--color-brand-primary);
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .gh-rich-body-light strong { font-weight: 700; color: var(--color-text-primary); }
        .gh-rich-body-light em { font-style: italic; }
        .gh-rich-body-light u { text-decoration: underline; }
        .gh-rich-body-light img { max-width: 100%; height: auto; border-radius: 12px; }
      `}</style>
    </section>
  );
}
