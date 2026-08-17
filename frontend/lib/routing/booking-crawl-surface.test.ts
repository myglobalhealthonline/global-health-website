import { describe, expect, it } from "vitest";
import {
  buildBookHref,
  isBookingWorkflowHref,
  isPreselectionPairHref,
} from "@/lib/routing/book-href";

/**
 * Booking crawl surface.
 *
 * A production crawl of every doctor and service page found 3,849 unique
 * booking URLs reachable from server-rendered anchors: 381 `?doctor=`,
 * 666 `?service=`, and 2,802 `?service=…&doctor=…`. The last group is a pure
 * cross-product — every doctor times every service they are assigned to —
 * whose only job is preselecting two wizard fields.
 *
 * The current rule these tests pin:
 *   • The clean `/book` landing page stays a real, crawlable anchor.
 *   • Any URL carrying wizard state renders as an accessible `<button>` that
 *     navigates client-side. The state still works for patients without
 *     exposing parameter variants as fresh crawler entry points.
 */

const AT = { country: "ireland", lang: "en" };

describe("isBookingWorkflowHref — what stops being an anchor", () => {
  it("detects a doctor-only booking state", () => {
    const href = buildBookHref({ ...AT, doctor: "dr-ahmed-maklad" });
    expect(href).toBe("/ireland/en/book?doctor=dr-ahmed-maklad");
    expect(isBookingWorkflowHref(href)).toBe(true);
  });

  it("detects a service-only booking state", () => {
    const href = buildBookHref({ ...AT, service: "womens-health-consultation" });
    expect(href).toBe("/ireland/en/book?service=womens-health-consultation");
    expect(isBookingWorkflowHref(href)).toBe(true);
  });

  it("keeps only the clean booking URL crawlable", () => {
    expect(isBookingWorkflowHref(buildBookHref(AT))).toBe(false);
    expect(isBookingWorkflowHref("/ireland/en/book")).toBe(false);
  });

  it("detects the other supported wizard parameters", () => {
    expect(isBookingWorkflowHref(buildBookHref({ ...AT, benefit: "none" }))).toBe(true);
    expect(isBookingWorkflowHref(buildBookHref({ ...AT, at: "2026-08-09T10:00" }))).toBe(true);
    expect(isBookingWorkflowHref(buildBookHref({ ...AT, doctor: "d", slot: "s" }))).toBe(true);
  });
});

describe("isPreselectionPairHref — what stops being an anchor", () => {
  it("detects the service+doctor cross-product", () => {
    const href = buildBookHref({ ...AT, service: "gp-consultation", doctor: "dr-x" });
    expect(href).toBe("/ireland/en/book?service=gp-consultation&doctor=dr-x");
    expect(isPreselectionPairHref(href)).toBe(true);
    expect(isBookingWorkflowHref(href)).toBe(true);
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
