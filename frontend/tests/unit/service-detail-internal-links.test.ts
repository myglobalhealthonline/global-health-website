import { describe, expect, it } from "vitest";
import { listingPath } from "@/lib/routing/service-listing-path";

/**
 * SEO-002 regression guard: the service detail page's "back to listing" link
 * used to hardcode the retired `/general-consultation` and
 * `/specialist-consultation` slugs (30 internally-linked 308s in the OpenSEO
 * crawl, all from this one function). It must resolve straight to the
 * current canonical hub, not a redirect source.
 */
describe("listingPath", () => {
  const labels = { specialist: "Specialist", prescription: "Prescription", general: "GP" };

  it("GENERAL resolves to the canonical gp-consultation-online hub", () => {
    expect(listingPath("GENERAL", "ireland", "en", labels).href).toBe(
      "/ireland/en/gp-consultation-online",
    );
  });

  it("SPECIALIST resolves to the canonical see-a-specialist hub", () => {
    expect(listingPath("SPECIALIST", "ireland", "en", labels).href).toBe(
      "/ireland/en/see-a-specialist",
    );
  });

  it("never points at the retired general-consultation/specialist-consultation slugs", () => {
    for (const kind of ["GENERAL", "SPECIALIST", "PRESCRIPTION"]) {
      const { href } = listingPath(kind, "czechia", "cs", labels);
      expect(href).not.toMatch(/\/(general|specialist)-consultation$/);
    }
  });
});
