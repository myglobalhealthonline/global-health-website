import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicDoctorRecord } from "@/lib/content/get-public-doctors";

/**
 * Duplicate-title fix for cross-listed doctors (GSC flagged 18 doctor URLs,
 * 9 doctors × 2 countries, sharing one `seoTitle` across markets).
 *
 * Rule: a doctor genuinely indexable in more than one country gets
 * `{title} · {Country}` appended, UNLESS the title already names that
 * country. A doctor indexable in exactly one country is untouched.
 *
 * Reuses `isPublicDoctorRecordIndexable` — the same predicate the profile
 * page's `noindex` tag and `app/sitemap.ts` use — so this is not a second,
 * title-specific publication rule, and there is no hardcoded doctor list.
 */

const rosterByCountry = vi.hoisted(() => ({
  value: {} as Record<string, PublicDoctorRecord[]>,
}));

vi.mock("@/lib/content/get-public-doctors", () => ({
  getPublicDoctorsForMarket: vi.fn(async (code: string) => rosterByCountry.value[code] ?? []),
}));

const { doctorIndexableCountryNames, doctorSiblingLocaleTitles, withLanguageTitle, withMarketTitle } = await import(
  "@/lib/seo/doctor-market-title"
);
const { getPublicDoctorsForMarket } = await import("@/lib/content/get-public-doctors");

function doctorRecord(overrides: Partial<PublicDoctorRecord> = {}): PublicDoctorRecord {
  return {
    slug: "dr-ahmed-maklad",
    fullName: "Dr Ahmed Maklad",
    title: "General Practitioner",
    bio:
      "Dr Maklad has practised general medicine for over fifteen years across " +
      "Czechia and Ireland, with a particular focus on chronic disease review, " +
      "men's health and same-day acute presentations in adults.",
    languages: ["English", "Czech", "Arabic"],
    specialties: ["General Practice"],
    imcRegistration: "123456",
    medicalRegistrationUrl: "https://www.medicalcouncil.ie/",
    qualifications: ["MB BCh BAO"],
    editorialChecklist: { readyToIndex: true },
    ...overrides,
  } as PublicDoctorRecord;
}

/** Publish `slug` (in exactly these country codes; every other market gets an empty roster). */
function publishIn(codes: string[], overrides: Partial<PublicDoctorRecord> = {}) {
  rosterByCountry.value = Object.fromEntries(codes.map((c) => [c, [doctorRecord(overrides)]]));
}

beforeEach(() => {
  rosterByCountry.value = {};
  vi.mocked(getPublicDoctorsForMarket).mockClear();
});

describe("doctorIndexableCountryNames", () => {
  it("single-market doctor → one country", async () => {
    publishIn(["ie"]);
    expect(await doctorIndexableCountryNames("dr-ahmed-maklad")).toEqual(["Ireland"]);
  });

  it("cross-listed doctor → every market the roster and indexability rule both clear", async () => {
    publishIn(["ie", "cz"]);
    const names = (await doctorIndexableCountryNames("dr-ahmed-maklad")).sort();
    expect(names).toEqual(["Czechia", "Ireland"]);
  });

  it("a market roster entry that fails the indexability rule does not count", async () => {
    rosterByCountry.value = {
      ie: [doctorRecord()],
      cz: [doctorRecord({ editorialChecklist: { readyToIndex: false } })],
    };
    expect(await doctorIndexableCountryNames("dr-ahmed-maklad")).toEqual(["Ireland"]);
  });

  it("a slug absent from every roster → empty list", async () => {
    publishIn([]);
    expect(await doctorIndexableCountryNames("dr-nobody")).toEqual([]);
  });
});

describe("withMarketTitle", () => {
  it("single-market doctor: title unchanged", () => {
    expect(withMarketTitle("Dr Ahmed Maklad · General Practitioner · Ireland", "Ireland", ["Ireland"])).toBe(
      "Dr Ahmed Maklad · General Practitioner · Ireland",
    );
  });

  it("cross-listed doctor: Ireland route gets an Ireland-specific title", () => {
    const title = withMarketTitle("Dr Ahmed Maklad", "Ireland", ["Ireland", "Czechia"]);
    expect(title).toBe("Dr Ahmed Maklad · Ireland");
  });

  it("cross-listed doctor: Czechia route gets a Czechia-specific title, and it differs from Ireland's", () => {
    const ieTitle = withMarketTitle("Dr Ahmed Maklad", "Ireland", ["Ireland", "Czechia"]);
    const czTitle = withMarketTitle("Dr Ahmed Maklad", "Czechia", ["Ireland", "Czechia"]);
    expect(czTitle).toBe("Dr Ahmed Maklad · Czechia");
    expect(czTitle).not.toBe(ieTitle);
  });

  it("already-differentiated title is left alone, not doubled", () => {
    const title = withMarketTitle(
      "Dr Example — Psychiatrist in Ireland",
      "Ireland",
      ["Ireland", "Czechia"],
    );
    expect(title).toBe("Dr Example — Psychiatrist in Ireland");
  });

  it("empty market list (defensive): title unchanged", () => {
    expect(withMarketTitle("Dr Ahmed Maklad", "Ireland", [])).toBe("Dr Ahmed Maklad");
  });

  it("base title already names the country in the page's own locale: not appended again", () => {
    // SEO-002 audit case: admin seoTitle names Czechia in Czech ("Česko"),
    // the English currentCountry check alone would miss it and double up.
    const title = withMarketTitle(
      "MUDr. Ahmed Maklad — Praktický lékař | Global Health Česko",
      "Czechia",
      ["Ireland", "Czechia"],
      "Česko",
    );
    expect(title).toBe("MUDr. Ahmed Maklad — Praktický lékař | Global Health Česko");
  });

  it("localized name absent from title: still appends the English form once", () => {
    const title = withMarketTitle("Dr Ahmed Maklad", "Czechia", ["Ireland", "Czechia"], "Česko");
    expect(title).toBe("Dr Ahmed Maklad · Czechia");
  });

  it("no localizedCountryName provided: behaves exactly as before", () => {
    const title = withMarketTitle("Dr Ahmed Maklad", "Czechia", ["Ireland", "Czechia"]);
    expect(title).toBe("Dr Ahmed Maklad · Czechia");
  });

  it("case-insensitive match on the localized form", () => {
    const title = withMarketTitle(
      "Dr Ahmed Maklad — ČESKO praxe",
      "Czechia",
      ["Ireland", "Czechia"],
      "Česko",
    );
    expect(title).toBe("Dr Ahmed Maklad — ČESKO praxe");
  });

  it("does not false-match a localized name inside an unrelated word", () => {
    // "Česko" must not match inside e.g. "Českosloven" (a different, longer word).
    const title = withMarketTitle(
      "Dr Ahmed Maklad — Českoslovenština specialist",
      "Czechia",
      ["Ireland", "Czechia"],
      "Česko",
    );
    expect(title).toBe("Dr Ahmed Maklad — Českoslovenština specialist · Czechia");
  });
});

// 2026-09-15 OpenSEO audit: 8 duplicate-title rows, es/pt locale variants of
// one Irish doctor sharing a title; 22 doctor titles over 60 chars.
describe("withLanguageTitle", () => {
  const ES = "Dr Emmanuel Dabup | Psiquiatra consultor | Irlanda";

  it("same title in a sibling locale: each locale names its own language", () => {
    const es = withLanguageTitle(ES, "es", [ES]);
    const pt = withLanguageTitle(ES, "pt", [ES]);
    expect(es).toBe(`${ES} · Español`); // 60 chars: fits whole
    expect(pt).not.toBe(es);
    expect(pt.endsWith("· Português")).toBe(true);
  });

  it("no collision: title unchanged", () => {
    expect(withLanguageTitle(ES, "es", ["Dr Emmanuel Dabup | Consultant Psychiatrist | Ireland"])).toBe(ES);
  });

  it("titles that only collide after the 60-char budget still get disambiguated", () => {
    const long = "Silvia Alexandre Fernandes | Terapeuta nutricional | Irlanda | Online";
    const other = "Silvia Alexandre Fernandes | Terapeuta nutricional | Irlanda | En línea";
    const result = withLanguageTitle(long, "pt", [other]);
    expect(result.endsWith(" · Português")).toBe(true);
    expect(Array.from(result).length).toBeLessThanOrEqual(60);
  });
});

describe("market suffix survives the search budget", () => {
  it("fits the base title into the room left beside the market name", () => {
    const base = "Priscila Figueiredo | Consultora de reabilitação e bem-estar | Irlanda";
    const title = withMarketTitle(base, "Portugal", ["Ireland", "Portugal"]);
    expect(title.endsWith(" · Portugal")).toBe(true);
    expect(Array.from(title).length).toBeLessThanOrEqual(60);
  });
});

describe("doctorSiblingLocaleTitles", () => {
  const IE = { code: "ie", defaultLocale: "en", supportedLocales: ["en", "es", "pt"] } as unknown as Parameters<
    typeof doctorSiblingLocaleTitles
  >[0];

  it("reads every other locale roster and falls back when seoTitle is missing", async () => {
    publishIn(["ie"]);
    const titles = await doctorSiblingLocaleTitles(IE, "dr-ahmed-maklad", "es", (d) => `${d.fullName} · ${d.title}`);
    expect(titles).toEqual(["Dr Ahmed Maklad · General Practitioner", "Dr Ahmed Maklad · General Practitioner"]);
    expect(vi.mocked(getPublicDoctorsForMarket).mock.calls.map((call) => call[1])).toEqual(["en", "pt"]);
  });
});
