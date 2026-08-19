import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { SectionSeam } from "@/components/ui/SectionSeam";

/**
 * Server-rendered chrome for the patient-reviews section: eyebrow, headline
 * and lede, with the live Doctify widget passed in as `children`.
 *
 * Split out of `DoctifyReviewsSection` because that component is loaded via
 * `dynamic(..., { ssr: false })` (the widget injects a third-party script, so
 * it must not run on the server). That put the whole section — including this
 * static, translated copy — outside the server response on the eleven page
 * types that render it, leaving a blank 420px div in the HTML. Only the widget
 * needs the client; the copy around it is plain markup and belongs in SSR
 * where crawlers, AI scrapers and no-JS visitors can read it.
 */
export function ReviewsSectionShell({
  theme = "ivory",
  language = "en",
  eyebrow,
  headline = "Rated by real patients",
  headlineAccent = "on Doctify",
  body,
  children,
}: {
  theme?: "ivory" | "forest";
  language?: string;
  eyebrow?: string;
  headline?: string;
  headlineAccent?: string;
  body?: string;
  children: React.ReactNode;
}) {
  const dark = theme === "forest";
  // `eyebrow`/`body` used to default to English string literals. No caller
  // passes either, so every non-en page rendered an English eyebrow and lede
  // above a translated headline — resolve them from the locale instead.
  const common = getCommonLocale(resolveLocale({ explicitLocale: language }));
  const eyebrowText = eyebrow ?? common.a11y.patientReviews;
  const bodyText = body ?? common.doctify.body;
  return (
    <section
      className={
        dark
          ? "gh-inline-clamp-section relative gh2-section-forest gh-medical-pattern gh-medical-pattern-dark"
          : "gh-inline-clamp-section relative overflow-hidden gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel"
      }
    >
      <SectionSeam theme={dark ? "dark" : "light"} />
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <div className="mb-10 md:mb-12">
          <span
            className={dark
              ? "text-[11px] font-bold uppercase tracking-[0.20em] text-[var(--color-brand-accent)]"
              : "text-[11px] font-bold uppercase tracking-[0.20em] text-[var(--color-brand-primary)]"}
          >
            {eyebrowText}
          </span>
          <h2
            className={dark
              ? "mt-3 max-w-[24ch] text-[clamp(1.9rem,3.5vw+0.4rem,3rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-white/92"
              : "mt-3 max-w-[24ch] text-[clamp(1.9rem,3.5vw+0.4rem,3rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-[var(--color-text-primary)]"}
          >
            {headline}{" "}
            <span
              className={dark ? "text-[var(--color-brand-accent)]" : "text-[var(--color-brand-primary)]"}
            >
              {headlineAccent}
            </span>
          </h2>
          <p
            className={dark
              ? "mt-4 max-w-[54ch] text-[15px] leading-relaxed text-[var(--gh2-on-dark-muted)]"
              : "mt-4 max-w-[54ch] text-[15px] leading-relaxed text-[var(--color-text-muted)]"}
          >
            {bodyText}
          </p>
        </div>

        {children}
      </div>
    </section>
  );
}
