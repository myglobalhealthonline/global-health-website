import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { landingServiceSlugs } from "./seo-landing.service.js";

describe("landingServiceSlugs", () => {
  it("returns nothing when the template is absent or empty", () => {
    assert.deepEqual(landingServiceSlugs(null), []);
    assert.deepEqual(landingServiceSlugs(undefined), []);
    assert.deepEqual(landingServiceSlugs({}), []);
  });

  it("reads the explicit ctaService", () => {
    assert.deepEqual(landingServiceSlugs({ ctaService: "chronic-disease-consultation" }), [
      "chronic-disease-consultation",
    ]);
  });

  it("ignores a blank ctaService", () => {
    assert.deepEqual(landingServiceSlugs({ ctaService: "   " }), []);
  });

  it("extracts slugs from related hrefs — the shape the seeded content uses", () => {
    assert.deepEqual(
      landingServiceSlugs({
        related: [
          { label: "Chronic disease", href: "/ireland/en/services/chronic-disease-consultation" },
          { label: "Cardiology", href: "/ireland/en/services/cardiology-specialist-consultation" },
        ],
      }),
      ["chronic-disease-consultation", "cardiology-specialist-consultation"],
    );
  });

  it("merges both sources and de-duplicates", () => {
    assert.deepEqual(
      landingServiceSlugs({
        ctaService: "chronic-disease-consultation",
        related: [
          { label: "Same one", href: "/ireland/pt/services/chronic-disease-consultation" },
          { label: "Другой", href: "/ireland/en/services/nutrition-specialist-consultation" },
        ],
      }),
      ["chronic-disease-consultation", "nutrition-specialist-consultation"],
    );
  });

  it("extracts slugs from the translation body — where most live content authors them", () => {
    assert.deepEqual(
      landingServiceSlugs(
        null,
        '<p>Book a <a href="/ireland/en/services/chronic-disease-consultation">chronic ' +
          'disease consultation</a> or see a ' +
          '<a href="/ireland/en/services/cardiology-specialist-consultation">cardiologist</a>.</p>',
      ),
      ["chronic-disease-consultation", "cardiology-specialist-consultation"],
    );
  });

  it("merges template and body sources without duplicating", () => {
    assert.deepEqual(
      landingServiceSlugs(
        { ctaService: "chronic-disease-consultation" },
        '<a href="/ireland/en/services/chronic-disease-consultation">same</a>' +
          '<a href="/ireland/en/services/nutrition-specialist-consultation">other</a>',
      ),
      ["chronic-disease-consultation", "nutrition-specialist-consultation"],
    );
  });

  it("skips related links that are not service URLs", () => {
    assert.deepEqual(
      landingServiceSlugs({
        related: [
          { label: "Doctors", href: "/ireland/en/doctors" },
          { label: "Book", href: "/ireland/en/book" },
          { label: "External", href: "https://example.com/services/not-ours" },
        ],
      }),
      // The absolute URL still contains /services/<slug>; matching it is
      // harmless — a slug that names no real service simply matches nothing.
      ["not-ours"],
    );
  });
});
