import { describe, expect, it } from "vitest";
import { asciiDoctorSlug, doctorSlugCandidates } from "@/lib/content/doctor-profile-data";

describe("asciiDoctorSlug", () => {
  it("de-accents and percent-decodes legacy Wix slugs", () => {
    expect(asciiDoctorSlug("mudr-vojt%C4%9Bch-%C4%8Dern%C3%BD")).toBe("mudr-vojtech-cerny");
    expect(asciiDoctorSlug("dra-ana-jer%C3%B3nimo")).toBe("dra-ana-jeronimo");
    expect(asciiDoctorSlug("tom%C3%A1s-ruiz-palacios")).toBe("tomas-ruiz-palacios");
  });

  it("survives malformed percent-encoding instead of throwing", () => {
    expect(asciiDoctorSlug("dr-100%-broken")).toBe("dr-100-broken");
  });
});

describe("doctorSlugCandidates", () => {
  // Each case is a real legacy URL from Search Console whose live slug differs.
  it.each([
    ["mudr-ahmed-maklad", "dr-ahmed-maklad"],
    ["mudr-michael-nytra", "dr-michael-nytra"],
    ["dra-margarida-andrade", "dr-margarida-andrade"],
    ["dra-ana-leal-neto", "dr-ana-leal-neto"],
    ["dra-beatriz-carvalho", "beatriz-carvalho"],
    ["dr-khoiamul-islam", "khoiamul-islam"],
    ["dr-maristela-ferro-nepomuceno", "maristela-ferro-nepomuceno"],
    ["physiotherapeut-priscila-figueiredo", "priscila-figueiredo"],
    ["javier-villarte-betancor", "dr-javier-villarte-betancor"],
    ["mudr-vojt%C4%9Bch-%C4%8Dern%C3%BD", "mudr-vojtech-cerny"],
  ])("offers %s → %s", (input, expected) => {
    expect(doctorSlugCandidates(input)).toContain(expected);
  });

  it("never offers the requested slug back, which would loop the redirect", () => {
    expect(doctorSlugCandidates("dr-grainne-ahern")).not.toContain("dr-grainne-ahern");
  });

  it("deduplicates", () => {
    const out = doctorSlugCandidates("mudr-jana-cyplinska");
    expect(new Set(out).size).toBe(out.length);
  });
});
