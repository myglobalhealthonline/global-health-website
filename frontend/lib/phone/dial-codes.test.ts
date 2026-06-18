import { describe, expect, it } from "vitest";
import {
  combinePhone,
  DEFAULT_DIAL,
  dialCodeForCountry,
  dialCodeForCountrySlug,
  splitPhone,
} from "./dial-codes";

describe("combinePhone", () => {
  it("joins dial + national as +<dial> <national>", () => {
    expect(combinePhone("353", "871234567")).toBe("+353 871234567");
  });
  it("strips a leading + from the dial", () => {
    expect(combinePhone("+34", "612345678")).toBe("+34 612345678");
  });
  it("returns empty when national is blank (keeps optional semantics)", () => {
    expect(combinePhone("353", "  ")).toBe("");
  });
});

describe("dialCodeForCountry", () => {
  it("maps app + ISO codes", () => {
    expect(dialCodeForCountry("ie")).toBe("353");
    expect(dialCodeForCountry("sp")).toBe("34");
    expect(dialCodeForCountry("es")).toBe("34");
    expect(dialCodeForCountry("rm")).toBe("40");
    expect(dialCodeForCountry("mt")).toBe("356");
  });
  it("falls back to Ireland for unknowns", () => {
    expect(dialCodeForCountry("zz")).toBe(DEFAULT_DIAL);
    expect(dialCodeForCountry(null)).toBe(DEFAULT_DIAL);
  });
});

describe("dialCodeForCountrySlug", () => {
  it("maps country URL slugs", () => {
    expect(dialCodeForCountrySlug("ireland")).toBe("353");
    expect(dialCodeForCountrySlug("portugal")).toBe("351");
    expect(dialCodeForCountrySlug("brazil")).toBe("55");
    expect(dialCodeForCountrySlug("czech-republic")).toBe("420");
  });
  it("falls back to the 2-letter map then Ireland", () => {
    expect(dialCodeForCountrySlug("mt-island")).toBe("356"); // "mt" prefix
    expect(dialCodeForCountrySlug("atlantis")).toBe(DEFAULT_DIAL);
  });
});

describe("splitPhone", () => {
  it("splits a known international number", () => {
    expect(splitPhone("+353 871234567")).toEqual({ dial: "353", national: "871234567" });
    expect(splitPhone("+34612345678")).toEqual({ dial: "34", national: "612345678" });
  });
  it("keeps an unknown country code rather than dropping it", () => {
    const r = splitPhone("+421902123456");
    expect(r.national.length).toBeGreaterThan(0);
    expect(`+${r.dial}${r.national}`).toBe("+421902123456");
  });
  it("treats a no-+ value as national under the fallback dial", () => {
    expect(splitPhone("871234567", "353")).toEqual({ dial: "353", national: "871234567" });
  });
  it("round-trips through combinePhone", () => {
    const parts = splitPhone("+351 912345678");
    expect(combinePhone(parts.dial, parts.national)).toBe("+351 912345678");
  });
  it("blank → fallback dial + empty national", () => {
    expect(splitPhone("", "55")).toEqual({ dial: "55", national: "" });
  });
});
