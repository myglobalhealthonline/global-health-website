import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DoctifyReviewsSection, DoctifyWidget, doctifyLanguage } from "./DoctifyReviews";
import { DoctifyReviewsSectionLazy } from "./DoctifyReviewsLazy";

/**
 * SEO-GROWTH-015 (revised): the site has exactly one Doctify review
 * profile, shown on every market's pages — there is no per-country gate to
 * test. What matters here is (1) nothing regresses that removal back in,
 * and (2) the widget's `language` param actually reaches Doctify's URLs
 * instead of being pinned to `"en"`.
 *
 * Static SSR never runs `useEffect` (consent is always unresolved), so it
 * can't observe the live iframe/script URLs — those are effect- or
 * consent-gated. The URL-template checks below read the component source
 * directly instead of rendering, which is the reliable way to guard a
 * string-template regression here.
 */

const SOURCE = readFileSync(path.join(__dirname, "DoctifyReviews.tsx"), "utf-8");

describe("Doctify components — no per-market gate (SEO-GROWTH-015 revised)", () => {
  it("renders normally with no country context — same behavior on every market's pages", () => {
    const widgetHtml = renderToStaticMarkup(
      <DoctifyWidget variant="horizontal" language="es" />,
    );
    expect(widgetHtml).not.toBe("");

    const sectionHtml = renderToStaticMarkup(
      <DoctifyReviewsSection headline="Rated by real patients" />,
    );
    expect(sectionHtml).toContain("Rated by real patients");
  });

  it("does not export a market-scoping predicate — the per-country gate was reverted", () => {
    expect(SOURCE).not.toContain("isDoctifyConfiguredForMarket");
    expect(SOURCE).not.toContain("DOCTIFY_CONFIGURED_MARKETS");
    expect(SOURCE).not.toMatch(/marketOk/);
  });

  it("derives Doctify's widget language from the page locale, never a fixed literal", () => {
    expect(SOURCE).not.toContain('const WIDGET_LANGUAGE = "en"');
    // Every `language=` query param in a doctify.com URL template must be
    // derived from the `language` prop, not pinned to one string.
    const languageParams = SOURCE.match(/language=\$\{[^}]+\}/g) ?? [];
    expect(languageParams.length).toBeGreaterThan(0);
    for (const param of languageParams) {
      expect(param).toBe("language=${doctifyLanguage(language)}");
    }
  });

  it("sends Doctify only the two languages it actually renders chrome for", () => {
    // Doctify returns EMPTY label spans for any language it does not ship —
    // "Excellent", "based on", "patient reviews" simply vanish rather than
    // falling back to English. Verified 2026-08-19 across eleven codes; `en`
    // and `de` were the only populated ones. Guard the allowlist and the
    // fallback so a future locale addition cannot silently blank the widget.
    expect(doctifyLanguage("pt")).toBe("en");
    expect(doctifyLanguage("cs")).toBe("en");
    expect(doctifyLanguage("es")).toBe("en");
    expect(doctifyLanguage("ro")).toBe("en");
    expect(doctifyLanguage("en")).toBe("en");
    expect(doctifyLanguage("de")).toBe("de");
    // Regional forms resolve on their base subtag.
    expect(doctifyLanguage("de-AT")).toBe("de");
    expect(doctifyLanguage("pt-PT")).toBe("en");
  });

  it("server-renders the section copy even though the widget is client-only", () => {
    // Regression guard: the whole section used to sit behind
    // `dynamic(..., { ssr: false })`, so the headline and lede never reached
    // the HTML response — crawlers saw an empty placeholder div instead of
    // the site's patient-proof section. Only the widget may be deferred.
    const html = renderToStaticMarkup(
      <DoctifyReviewsSectionLazy
        language="pt"
        eyebrow="Avaliacoes de pacientes"
        headline="Avaliado por pacientes reais"
        headlineAccent="no Doctify"
        body="Avaliacoes independentes e verificadas."
      />,
    );
    expect(html).toContain("Avaliado por pacientes reais");
    expect(html).toContain("Avaliacoes de pacientes");
    expect(html).toContain("Avaliacoes independentes e verificadas.");
  });

  it("keeps the existing tenant/slug — no new Doctify identifiers invented", () => {
    expect(SOURCE).toContain('const TENANT = "athena-ie"');
    expect(SOURCE).toContain('const SLUG = "global-health-ireland"');
  });
});
