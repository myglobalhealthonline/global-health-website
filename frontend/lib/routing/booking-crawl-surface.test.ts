import { describe, expect, it } from "vitest";
import { buildBookHref, isPreselectionPairHref } from "@/lib/routing/book-href";

/**
 * Booking crawl surface.
 *
 * A production crawl of every doctor and service page found 3,849 unique
 * booking URLs reachable from server-rendered anchors: 381 `?doctor=`,
 * 666 `?service=`, and 2,802 `?service=…&doctor=…`. The last group is a pure
 * cross-product — every doctor times every service they are assigned to —
 * whose only job is preselecting two wizard fields.
 *
 * The rule these tests pin:
 *   • ONE service and ONE doctor link stay real, crawlable anchors. They are
 *     finite, useful entry points and are deliberately kept.
 *   • The service×doctor PAIR never appears in server-rendered markup. Cards
 *     and CTAs render an accessible `<button>` that navigates client-side, so
 *     the combination still works for a user and still preselects both fields.
 */

const AT = { country: "ireland", lang: "en" };

describe("isPreselectionPairHref — what stays crawlable", () => {
  it("keeps a doctor-only booking link crawlable", () => {
    const href = buildBookHref({ ...AT, doctor: "dr-ahmed-maklad" });
    expect(href).toBe("/ireland/en/book?doctor=dr-ahmed-maklad");
    expect(isPreselectionPairHref(href)).toBe(false);
  });

  it("keeps a service-only booking link crawlable", () => {
    const href = buildBookHref({ ...AT, service: "womens-health-consultation" });
    expect(href).toBe("/ireland/en/book?service=womens-health-consultation");
    expect(isPreselectionPairHref(href)).toBe(false);
  });

  it("keeps the clean booking URL crawlable", () => {
    expect(isPreselectionPairHref(buildBookHref(AT))).toBe(false);
    expect(isPreselectionPairHref("/ireland/en/book")).toBe(false);
  });

  it("does not treat other single-parameter booking links as pairs", () => {
    expect(isPreselectionPairHref(buildBookHref({ ...AT, benefit: "none" }))).toBe(false);
    expect(isPreselectionPairHref(buildBookHref({ ...AT, at: "2026-08-09T10:00" }))).toBe(false);
    expect(isPreselectionPairHref(buildBookHref({ ...AT, doctor: "d", slot: "s" }))).toBe(false);
  });
});

describe("isPreselectionPairHref — what stops being an anchor", () => {
  it("detects the service+doctor cross-product", () => {
    const href = buildBookHref({ ...AT, service: "gp-consultation", doctor: "dr-x" });
    expect(href).toBe("/ireland/en/book?service=gp-consultation&doctor=dr-x");
    expect(isPreselectionPairHref(href)).toBe(true);
  });

  it("detects the id-based form the wizard uses", () => {
    expect(isPreselectionPairHref(buildBookHref({ ...AT, serviceId: "svc_1", doctor: "dr-x" }))).toBe(
      true,
    );
  });

  it("still detects a pair carrying extra wizard state", () => {
    // language-filtered-doctors adds benefit/slot/at on top of the pair.
    const href = buildBookHref({
      ...AT,
      service: "gp-consultation",
      doctor: "dr-x",
      benefit: "insurance:c1",
      slot: "s1",
      at: "2026-08-09T10:00",
    });
    expect(isPreselectionPairHref(href)).toBe(true);
  });

  it("is order-independent and tolerates absolute URLs", () => {
    expect(isPreselectionPairHref("/ireland/en/book?doctor=dr-x&service=gp")).toBe(true);
    expect(
      isPreselectionPairHref("https://www.myglobalhealth.online/ireland/en/book?service=gp&doctor=d"),
    ).toBe(true);
  });

  it("handles empty and malformed input without throwing", () => {
    expect(isPreselectionPairHref(null)).toBe(false);
    expect(isPreselectionPairHref(undefined)).toBe(false);
    expect(isPreselectionPairHref("")).toBe(false);
    expect(isPreselectionPairHref("/ireland/en/book?")).toBe(false);
    expect(isPreselectionPairHref("/ireland/en/book?service=&doctor=")).toBe(true);
  });
});

describe("preselection still works once the user navigates", () => {
  it("the button navigates to a URL that preselects BOTH fields", () => {
    // The control is a button rather than an anchor, but the destination is
    // byte-identical to the href it replaced — so the wizard reads the same
    // params and the browser URL after the click is unchanged.
    const href = buildBookHref({ ...AT, service: "gp-consultation", doctor: "dr-x" });
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.get("service")).toBe("gp-consultation");
    expect(params.get("doctor")).toBe("dr-x");
  });
});
