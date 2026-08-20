import { describe, expect, it } from "vitest";
import { marketDisplayName } from "./doctor-market-name";

describe("marketDisplayName", () => {
  it("keeps the Czech honorific on Czech pages and drops it on Irish ones", () => {
    // The bug: one global `fullName` served both markets, so whichever
    // honorific the base row carried leaked into the other country.
    expect(marketDisplayName("khoiamul-islam", "cz", "MUDr. Khoiamul Islam")).toBe(
      "MUDr. Khoiamul Islam",
    );
    expect(marketDisplayName("khoiamul-islam", "ie", "MUDr. Khoiamul Islam")).toBe(
      "Dr Khoiamul Islam",
    );
    // Same defect, opposite direction: this record's base name is "Dr ...".
    expect(marketDisplayName("dr-ahmed-maklad", "cz", "Dr Ahmed Maklad")).toBe(
      "MUDr. Ahmed Maklad",
    );
    expect(marketDisplayName("dr-ahmed-maklad", "ie", "Dr Ahmed Maklad")).toBe("Dr Ahmed Maklad");
  });

  it("returns the global name for doctors with no market override", () => {
    expect(marketDisplayName("dr-tiago-miguel-figueira", "pt", "Dr Tiago Miguel Figueira")).toBe(
      "Dr Tiago Miguel Figueira",
    );
    expect(marketDisplayName("dr-mohammed-omar", "ie", "Dr Mohammed Omar")).toBe("Dr Mohammed Omar");
  });

  it("falls back to the global name when the route resolved no market", () => {
    // Legacy/global paths reach the resolver without a country code — an
    // override keyed by market must not guess one.
    expect(marketDisplayName("khoiamul-islam", undefined, "MUDr. Khoiamul Islam")).toBe(
      "MUDr. Khoiamul Islam",
    );
    expect(marketDisplayName("khoiamul-islam", null, "MUDr. Khoiamul Islam")).toBe(
      "MUDr. Khoiamul Islam",
    );
  });

  it("matches slug and country case-insensitively", () => {
    expect(marketDisplayName("Khoiamul-Islam", "IE", "MUDr. Khoiamul Islam")).toBe(
      "Dr Khoiamul Islam",
    );
  });
});
