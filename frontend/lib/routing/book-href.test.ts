import { describe, expect, it } from "vitest";
import { buildBookHref, buildServiceDetailHref, isPreselectionPairHref } from "./book-href";

/**
 * International-linking batch (2026-08-09). A doctor profile's assigned-
 * service card now renders both a real service-detail link and the existing
 * booking CTA (lib/content/doctor-profile-page.tsx). No component-render
 * harness exists in this repo (vitest.config.ts runs `environment: "node"`
 * and explicitly excludes `app/` — RSC rendering isn't wired up), so this
 * locks the two hrefs the card is built from instead: the detail link must be
 * a plain, crawlable service URL, and the booking link must still be the
 * doctor+service preselection pair that `isPreselectionPairHref` renders as a
 * client-side button rather than a crawlable anchor (see BookNowButton.tsx).
 */
describe("buildServiceDetailHref", () => {
  it("builds a plain /{country}/{lang}/services/{slug} URL", () => {
    expect(buildServiceDetailHref("ireland", "en", "acute-medical-consultation")).toBe(
      "/ireland/en/services/acute-medical-consultation",
    );
  });

  it("is never mistaken for a preselection-pair booking href", () => {
    const href = buildServiceDetailHref("ireland", "en", "acute-medical-consultation");
    expect(isPreselectionPairHref(href)).toBe(false);
  });
});

describe("doctor profile assigned-service card hrefs", () => {
  it("the booking destination remains a doctor+service preselection pair", () => {
    const bookHref = buildBookHref({
      country: "ireland",
      lang: "en",
      service: "acute-medical-consultation",
      doctor: "dr-abdelrahman-mustafa",
    });
    expect(isPreselectionPairHref(bookHref)).toBe(true);
  });

  it("detail and booking hrefs are distinct destinations for the same service", () => {
    const detailHref = buildServiceDetailHref("ireland", "en", "acute-medical-consultation");
    const bookHref = buildBookHref({
      country: "ireland",
      lang: "en",
      service: "acute-medical-consultation",
      doctor: "dr-abdelrahman-mustafa",
    });
    expect(detailHref).not.toBe(bookHref);
    expect(detailHref).toBe("/ireland/en/services/acute-medical-consultation");
    expect(bookHref.startsWith("/ireland/en/book?")).toBe(true);
  });
});
