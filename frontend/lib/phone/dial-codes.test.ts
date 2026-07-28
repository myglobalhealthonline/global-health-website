import { describe, expect, it } from "vitest";
import {
  combinePhone,
  countryForDial,
  DEFAULT_DIAL,
  DIAL_OPTIONS,
  dialCodeForCountry,
  dialCodeForCountrySlug,
  PRIORITY_OPTION_COUNT,
  searchDialOptions,
  splitPhone,
} from "./dial-codes";
import { COUNTRIES, PRIORITY_COUNTRY_CODES } from "./countries";

describe("DIAL_OPTIONS", () => {
  // Options are addressed by country code, not by dial: the picker is a
  // listbox keyed on `option.key` (see country-dial-select). Dial codes are
  // deliberately NOT unique now that the list is the full ISO set — the whole
  // NANP shares +1, Russia and Kazakhstan share +7 — so only the key has to be.
  it("has unique keys", () => {
    expect(new Set(DIAL_OPTIONS.map((o) => o.key)).size).toBe(DIAL_OPTIONS.length);
  });
  it("keeps the active markets pinned on top", () => {
    expect(DIAL_OPTIONS.slice(0, 3).map((o) => o.key)).toEqual(["ie", "cz", "pt"]);
  });
});

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

describe("DIAL_OPTIONS", () => {
  it("covers the whole world, not just the active markets", () => {
    expect(DIAL_OPTIONS.length).toBe(COUNTRIES.length);
    expect(DIAL_OPTIONS.length).toBeGreaterThan(200);
    for (const code of ["de", "us", "in", "ng", "au", "jp", "ua"]) {
      expect(DIAL_OPTIONS.some((o) => o.code === code)).toBe(true);
    }
  });
  it("pins the active markets to the top, in business order", () => {
    expect(PRIORITY_OPTION_COUNT).toBe(PRIORITY_COUNTRY_CODES.length);
    expect(DIAL_OPTIONS.slice(0, PRIORITY_OPTION_COUNT).map((o) => o.code)).toEqual([
      ...PRIORITY_COUNTRY_CODES,
    ]);
  });
  it("lists the rest alphabetically and never twice", () => {
    const rest = DIAL_OPTIONS.slice(PRIORITY_OPTION_COUNT).map((o) => o.label);
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b, "en")));
    expect(new Set(DIAL_OPTIONS.map((o) => o.code)).size).toBe(DIAL_OPTIONS.length);
  });
  it("resolves a dial code back to a country for the picker label", () => {
    expect(countryForDial("49")?.label).toBe("Germany");
    expect(countryForDial("+353")?.label).toBe("Ireland");
    expect(countryForDial("999")).toBeUndefined();
  });
});

describe("searchDialOptions", () => {
  it("matches on country name prefix", () => {
    expect(searchDialOptions("germ")[0].code).toBe("de");
    expect(searchDialOptions("Nether")[0].code).toBe("nl");
  });
  it("matches on dial digits, with or without +", () => {
    expect(searchDialOptions("+49")[0].code).toBe("de");
    expect(searchDialOptions("49")[0].code).toBe("de");
  });
  it("matches on ISO code and common aliases", () => {
    expect(searchDialOptions("uae")[0].code).toBe("ae");
    expect(searchDialOptions("holland")[0].code).toBe("nl");
    expect(searchDialOptions("burma")[0].code).toBe("mm");
    expect(searchDialOptions("jp")[0].code).toBe("jp");
  });
  it("ignores accents so an ASCII keyboard can find every country", () => {
    expect(searchDialOptions("reunion")[0].code).toBe("re");
    expect(searchDialOptions("cote")[0].code).toBe("ci");
  });
  it("returns the full list for a blank query and none for a miss", () => {
    expect(searchDialOptions("  ")).toHaveLength(DIAL_OPTIONS.length);
    expect(searchDialOptions("zzzzz")).toHaveLength(0);
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
  it("maps every other ISO code too", () => {
    expect(dialCodeForCountry("de")).toBe("49");
    expect(dialCodeForCountry("US")).toBe("1");
    expect(dialCodeForCountry("ng")).toBe("234");
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
  it("splits numbers from countries the picker only just gained", () => {
    expect(splitPhone("+49 15112345678")).toEqual({ dial: "49", national: "15112345678" });
    expect(splitPhone("+91 9876543210")).toEqual({ dial: "91", national: "9876543210" });
  });
  it("prefers the longest matching prefix inside the +1 block", () => {
    // 876 is Jamaica's NANP code, not a US subscriber number starting 876.
    expect(splitPhone("+18765551234")).toEqual({ dial: "1876", national: "5551234" });
    expect(splitPhone("+12125551234")).toEqual({ dial: "1", national: "2125551234" });
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
