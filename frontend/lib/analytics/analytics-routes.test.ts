import { describe, expect, it } from "vitest";
import { isClarityAllowed, sanitizePagePath, stripLocalePrefix } from "./analytics-routes";

describe("stripLocalePrefix", () => {
  it("removes a /{country}/{lang} head", () => {
    expect(stripLocalePrefix("/ireland/en/doctors/dr-maria-santos")).toBe("/doctors/dr-maria-santos");
    expect(stripLocalePrefix("/czechia/cs/pricing")).toBe("/pricing");
    expect(stripLocalePrefix("/portugal/pt/tests/full-blood-count")).toBe("/tests/full-blood-count");
  });

  it("maps a bare country home to /", () => {
    expect(stripLocalePrefix("/ireland/en")).toBe("/");
    expect(stripLocalePrefix("/brazil/pt")).toBe("/");
  });

  it("accepts an admin-added country slug it has never seen (open-ended registry)", () => {
    expect(stripLocalePrefix("/uk/de/pricing")).toBe("/pricing");
  });

  it("leaves locale-less public routes alone", () => {
    expect(stripLocalePrefix("/about")).toBe("/about");
    expect(stripLocalePrefix("/checkout/success")).toBe("/checkout/success");
    expect(stripLocalePrefix("/")).toBe("/");
    expect(stripLocalePrefix("")).toBe("/");
  });

  it("does not mistake a content slug for a locale", () => {
    // /blog/[slug] where the post slug happens to be "en" — the regression
    // this function's NON_COUNTRY_ROOTS guard exists for.
    expect(stripLocalePrefix("/blog/en")).toBe("/blog/en");
    expect(stripLocalePrefix("/blog/es")).toBe("/blog/es");
  });

  it("does not strip a portal route that collides in shape", () => {
    expect(stripLocalePrefix("/doctor/pt")).toBe("/doctor/pt");
    expect(stripLocalePrefix("/account/es")).toBe("/account/es");
  });

  it("handles brazil, which is both a (global) route root and a country slug", () => {
    // /brazil/{lang}/... is the Brazilian market and must strip normally.
    expect(stripLocalePrefix("/brazil/pt/pricing")).toBe("/pricing");
    expect(stripLocalePrefix("/brazil/pt")).toBe("/");
    // /brazil/consent is the LGPD form — "consent" is not a locale, so it
    // stays intact and CLARITY_DENY catches it on the "brazil" head.
    expect(stripLocalePrefix("/brazil/consent")).toBe("/brazil/consent");
    expect(stripLocalePrefix("/brazil/consent/success")).toBe("/brazil/consent/success");
  });
});

describe("isClarityAllowed", () => {
  const allowed = [
    "/",
    "/ireland/en",
    "/about",
    "/contact",
    "/faq",
    "/privacy",
    "/terms",
    "/blog",
    "/blog/how-to-manage-hypertension",
    "/ireland/en/blog/flu-season",
    "/ireland/en/doctors",
    "/ireland/en/doctors/dr-maria-santos",
    "/ireland/en/general-consultation",
    "/ireland/en/specialist-consultation",
    "/ireland/en/prescriptions",
    "/ireland/en/pricing",
    "/ireland/en/services/dermatology-consultation",
    "/ireland/en/tests",
    "/ireland/en/tests/full-blood-count",
    "/ireland/en/health/thyroid-function",
    "/ireland/en/legal",
    "/ireland/en/legal/refund-policy",
    // Brazil is a real market: its marketing pages must be allowed even though
    // "brazil" is also the head of the (global) LGPD consent route.
    "/brazil/pt",
    "/brazil/pt/pricing",
  ];

  const denied = [
    // Public layout, but the visitor supplies data about themselves.
    "/cart",
    "/checkout",
    "/checkout/success",
    "/checkout/cancelled",
    "/patient-upload",
    "/access-request",
    "/card-verify/GH-88213",
    "/verify/certificate/9f1c2d3e",
    "/cross-border-consent",
    "/brazil/consent",
    "/brazil/consent/success",
    "/reviews/rate",
    "/ireland/en/book",
    "/ireland/en/cart",
    "/ireland/en/checkout",
    "/ireland/en/checkout/success",
    // 308 redirect, never rendered — implicit deny by omission from the allowlist.
    "/ireland/en/consult/dermatology",
    // Portal. Unreachable, but the gate must hold standalone.
    "/account",
    "/account/bookings/4821",
    "/admin",
    "/admin/patients/a@b.com",
    "/doctor",
    "/doctor/appointments/12",
    "/corporate",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/corporate-invite/tok",
    "/pay/ord_123",
    "/print/invoices/9",
    "/share/consults/tok",
    "/unauthorized",
    // Unknown route: allowlist means default deny.
    "/ireland/en/some-new-page",
    "/something-nobody-listed",
  ];

  for (const path of allowed) {
    it(`allows ${path}`, () => {
      expect(isClarityAllowed(path)).toBe(true);
    });
  }

  for (const path of denied) {
    it(`denies ${path}`, () => {
      expect(isClarityAllowed(path)).toBe(false);
    });
  }
});

describe("sanitizePagePath", () => {
  it("always drops the query string and hash", () => {
    expect(sanitizePagePath("/checkout/success?session_id=cs_live_a1b2c3")).toBe("/checkout/success");
    expect(sanitizePagePath("/about?utm_source=x&email=a@b.com")).toBe("/about");
    expect(sanitizePagePath("/about#section")).toBe("/about");
  });

  it("keeps the country/lang prefix — market dimensions, not personal data", () => {
    expect(sanitizePagePath("/ireland/en/pricing")).toBe("/ireland/en/pricing");
    expect(sanitizePagePath("/ireland/en")).toBe("/ireland/en");
    expect(sanitizePagePath("/")).toBe("/");
  });

  it("keeps published content slugs — they identify content, not people", () => {
    expect(sanitizePagePath("/blog/how-to-manage-hypertension")).toBe("/blog/how-to-manage-hypertension");
    expect(sanitizePagePath("/ireland/en/doctors/dr-maria-santos")).toBe("/ireland/en/doctors/dr-maria-santos");
    expect(sanitizePagePath("/ireland/en/services/dermatology-consultation")).toBe(
      "/ireland/en/services/dermatology-consultation",
    );
    expect(sanitizePagePath("/ireland/en/tests/full-blood-count")).toBe("/ireland/en/tests/full-blood-count");
  });

  it("applies the named redactions", () => {
    expect(sanitizePagePath("/card-verify/GH-88213")).toBe("/card-verify/:code");
    expect(sanitizePagePath("/verify/certificate/9f1c2d3e-1111-2222-3333-444455556666")).toBe(
      "/verify/certificate/:id",
    );
    expect(sanitizePagePath("/share/consults/abc123token")).toBe("/share/consults/:token");
    expect(sanitizePagePath("/corporate-invite/xyz")).toBe("/corporate-invite/:token");
    expect(sanitizePagePath("/pay/ord_00123")).toBe("/pay/:orderId");
    expect(sanitizePagePath("/admin/patients/patient@example.com")).toBe("/admin/patients/:email");
    expect(sanitizePagePath("/doctor/patients/patient@example.com")).toBe("/doctor/patients/:email");
    expect(sanitizePagePath("/print/invoices/9012")).toBe("/print/:doc/:id");
  });

  it("catches opaque identifiers on routes with no named rule", () => {
    expect(sanitizePagePath("/account/orders/4821")).toBe("/account/orders/:id");
    expect(sanitizePagePath("/account/bookings/clh3k9x2p0000qwer1234asdf")).toBe("/account/bookings/:id");
    expect(sanitizePagePath("/x/9f1c2d3e-1111-2222-3333-444455556666")).toBe("/x/:id");
    expect(sanitizePagePath("/x/someone@example.com")).toBe("/x/:id");
  });

  it("strips a trailing slash so /about and /about/ are one GA row", () => {
    expect(sanitizePagePath("/about/")).toBe("/about");
    expect(sanitizePagePath("/ireland/en/")).toBe("/ireland/en");
  });
});
