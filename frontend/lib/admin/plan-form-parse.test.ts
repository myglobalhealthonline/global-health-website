import { describe, it, expect } from "vitest";
import { majorToCents, parsePlanForm } from "./plan-form-parse";

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

const valid = {
  countryId: "c-ie",
  planType: "ESSENTIAL",
  slug: "essential-care",
  name: "Essential Care",
  monthlyPrice: "20.00",
  currencyCode: "eur",
  monthlyConsultationCredits: "1",
};

describe("majorToCents", () => {
  it("converts major units to integer cents", () => {
    expect(majorToCents("20")).toBe(2000);
    expect(majorToCents("20.50")).toBe(2050);
    expect(majorToCents("0")).toBe(0);
  });
  it("returns null for blank or invalid", () => {
    expect(majorToCents("")).toBeNull();
    expect(majorToCents("abc")).toBeNull();
    expect(majorToCents("-5")).toBeNull();
  });
});

describe("parsePlanForm", () => {
  it("parses a valid create body and uppercases currency", () => {
    const res = parsePlanForm(form(valid), { includeCountry: true });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.monthlyPriceCents).toBe(2000);
      expect(res.data.currencyCode).toBe("EUR");
      expect(res.data.countryId).toBe("c-ie");
      expect(res.data.monthlyConsultationCredits).toBe(1);
      expect(res.data.isActive).toBe(true);
      expect(res.data.planType).toBe("ESSENTIAL");
    }
  });

  it("requires a valid plan type on create", () => {
    const fd = form({ ...valid });
    fd.delete("planType");
    expect(parsePlanForm(fd, { includeCountry: true }).ok).toBe(false);
    expect(parsePlanForm(form({ ...valid, planType: "BOGUS" }), { includeCountry: true }).ok).toBe(false);
  });

  it("omits plan type on update (immutable)", () => {
    const res = parsePlanForm(form({ ...valid, planType: "PREMIUM" }));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.planType).toBeUndefined();
  });

  it("requires a country when includeCountry is set", () => {
    const fd = form({ ...valid });
    fd.delete("countryId");
    const res = parsePlanForm(fd, { includeCountry: true });
    expect(res.ok).toBe(false);
  });

  it("rejects a missing price", () => {
    const fd = form({ ...valid });
    fd.delete("monthlyPrice");
    const res = parsePlanForm(fd, { includeCountry: true });
    expect(res.ok).toBe(false);
  });

  it("reads checkbox booleans (on) and omits country for update", () => {
    const res = parsePlanForm(form({ ...valid, isFeatured: "on", isActive: "" }));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.isFeatured).toBe(true);
      expect(res.data.countryId).toBeUndefined();
    }
  });
});
