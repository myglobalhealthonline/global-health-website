import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCountryPlansResult } = vi.hoisted(() => ({ getCountryPlansResult: vi.fn() }));

vi.mock("@/lib/content/get-country-plans", () => ({ getCountryPlansResult }));
vi.mock("@/lib/content/get-public-countries", async () => {
  const { getCountryByCode } = await import("@/data/countries");
  return {
    getPublicCountryByCode: vi.fn(async (code: string) => ({
      ...getCountryByCode(code),
      enabledFeatures: ["subscriptions"],
    })),
  };
});
vi.mock("@/components/sections/DoctifyReviewsLazy", () => ({ DoctifyWidgetLazy: () => null }));
vi.mock("@/app/[country]/[lang]/pricing/_components/PricingPlansGrid", () => ({
  PricingPlansGrid: () => <div>PLAN_GRID</div>,
}));

import PricingPage from "@/app/[country]/[lang]/pricing/page";
import { PublicContentUnavailableError } from "@/lib/content/public-content-source";

const params = Promise.resolve({ country: "portugal", lang: "pt" });

describe("Portugal pricing with an empty catalogue", () => {
  beforeEach(() => getCountryPlansResult.mockReset());

  it("shows the unavailable state without subscription sales copy", async () => {
    getCountryPlansResult.mockResolvedValue({ ok: true, plans: [] });

    const html = renderToStaticMarkup(await PricingPage({ params }));

    expect(html).toContain("Planos mensais ainda não disponíveis em Portugal");
    expect(html).toContain("A adesão ainda não está disponível em Portugal");
    expect(html).toMatch(/<h2[^>]*>A adesão ainda não está disponível em Portugal<\/h2>/);
    expect(html).not.toContain("Ver planos");
    expect(html).not.toContain("Escolha o seu plano mensal");
    expect(html).not.toContain("Essential, Comprehensive ou Premium Wellness");
    expect(html).not.toContain("Planos flexíveis");
  });

  it("keeps the subscription flow when the catalogue has a plan", async () => {
    getCountryPlansResult.mockResolvedValue({
      ok: true,
      plans: [{
        id: "plan-1",
        name: "Essential",
        shortDescription: "Plano mensal",
        monthlyPriceCents: 3900,
        currencyCode: "EUR",
      }],
    });

    const html = renderToStaticMarkup(await PricingPage({ params }));

    expect(html).toContain("Ver planos");
    expect(html).toContain("Escolha o seu plano mensal");
    expect(html).toContain("Essential, Comprehensive ou Premium Wellness");
    expect(html).toContain("PLAN_GRID");
  });
});

/**
 * Fail-closed on a malformed catalogue is deliberate (§38 review, §3.9).
 * `getCountryPlansResult` throws when any plan/perk/kit row fails validation,
 * and this route must NOT catch it: a caught error would render the "not
 * available yet" empty state — a different title, H1 and no plan CTA — on a
 * live revenue page, and Google would recrawl that. A 500 is retryable and
 * leaves ISR serving the last good render.
 *
 * Its own `describe` because the block above resets the mock in `beforeEach`,
 * and a rejecting mock combined with `mockReset()` double-reports the
 * rejection as an unhandled error under Vitest 4.
 */
describe("Portugal pricing with a malformed catalogue", () => {
  it("propagates the error instead of rendering the unavailable state", async () => {
    getCountryPlansResult.mockImplementation(async () => {
      throw new PublicContentUnavailableError("country-plans:pt:pt", "backend returned 200 with no usable plan catalogue");
    });

    let thrown: unknown;
    try {
      await PricingPage({ params });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(PublicContentUnavailableError);
  });
});
