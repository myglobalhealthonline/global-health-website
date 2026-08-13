import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DoctifyReviewsSection, DoctifyWidget } from "./DoctifyReviews";

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

  it("passes the page's language into Doctify's widget URLs instead of a hardcoded \"en\"", () => {
    expect(SOURCE).not.toContain('const WIDGET_LANGUAGE = "en"');
    // Every `language=` query param in a doctify.com URL template must
    // interpolate the `language` prop, not a fixed literal.
    const languageParams = SOURCE.match(/language=\$\{[^}]+\}/g) ?? [];
    expect(languageParams.length).toBeGreaterThan(0);
    for (const param of languageParams) {
      expect(param).toBe("language=${language}");
    }
  });

  it("keeps the existing tenant/slug — no new Doctify identifiers invented", () => {
    expect(SOURCE).toContain('const TENANT = "athena-ie"');
    expect(SOURCE).toContain('const SLUG = "global-health-ireland"');
  });
});
