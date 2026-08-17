import { describe, expect, it } from "vitest";
import {
  isPublicServiceRecordIndexable,
  publicServiceLocaleIssues,
  safeLocalizedServiceMeta,
  type PublicServiceLocaleRecord,
} from "@/lib/content/publication-validation";

/**
 * The one rule the service page (robots + hreflang) and `sitemap.ts` both call.
 * The point of these tests is the invariant behind that sharing: a service
 * locale that is not genuinely publishable must never become indexable,
 * sitemap-submitted or hreflang-advertised — in ANY market, including markets
 * and services that do not exist yet.
 */

/** A complete, publishable service in its market's own language. */
function serviceRecord(
  overrides: Partial<PublicServiceLocaleRecord> = {},
): PublicServiceLocaleRecord {
  return {
    kind: "GENERAL",
    slug: "consulta-medica-online",
    isActive: true,
    visibility: "PUBLIC",
    name: "Consulta Médica Online",
    summary: null,
    seoTitle: "Médico Online España | Cita el Mismo Día",
    seoDescription: "Habla con un médico colegiado hoy mismo, sin salir de casa.",
    heroTitle: "Consulta médica online en España",
    heroDescription: "Consulta con un médico colegiado el mismo día.",
    detailBody:
      "<h2>Atención médica en España</h2><p>Nuestros médicos colegiados atienden " +
      "consultas online el mismo día, con receta electrónica y justificante " +
      "cuando es clínicamente apropiado. Si tienes dolor torácico u otra " +
      "urgencia, llama al 112.</p>",
    resolvedLocale: "es",
    translatedFields: [
      "name",
      "seoTitle",
      "seoDescription",
      "heroTitle",
      "heroDescription",
      "detailBody",
    ],
    ...overrides,
  };
}

describe("isPublicServiceRecordIndexable — healthy records stay indexable", () => {
  it("indexes a complete service in its market's primary language", () => {
    expect(isPublicServiceRecordIndexable(serviceRecord(), "es", "es")).toBe(true);
  });

  it("indexes a complete secondary-language translation", () => {
    const en = serviceRecord({
      name: "Online Doctor Consultation",
      resolvedLocale: "en",
      detailBody:
        "<h2>Healthcare in Spain</h2><p>Our registered doctors run same-day " +
        "online consultations, with an electronic prescription or a sick " +
        "certificate where clinically appropriate. Call 112 for emergencies.</p>",
    });
    expect(isPublicServiceRecordIndexable(en, "en", "es")).toBe(true);
  });

  it("indexes a SPECIALIST service the same way as a GENERAL one", () => {
    expect(isPublicServiceRecordIndexable(serviceRecord({ kind: "SPECIALIST" }), "es", "es")).toBe(
      true,
    );
  });

  it("keeps a concise service indexable — the rule is emptiness, not depth", () => {
    const concise = serviceRecord({
      detailBody: null,
      summary:
        "Consulta online con un médico colegiado en España. Receta electrónica " +
        "y justificante médico cuando procede clínicamente.",
      translatedFields: ["name", "summary"],
    });
    expect(isPublicServiceRecordIndexable(concise, "es", "es")).toBe(true);
  });

  it("does not deindex over missing summary (Brazil) or heroDescription (Romania)", () => {
    const brazil = serviceRecord({
      summary: null,
      resolvedLocale: "pt",
      translatedFields: ["name", "seoTitle", "heroTitle", "detailBody"],
      heroDescription: null,
    });
    expect(isPublicServiceRecordIndexable(brazil, "pt", "pt")).toBe(true);
  });

  it("does not deindex over a missing seoTitle when the localized name exists", () => {
    const noSeo = serviceRecord({
      seoTitle: null,
      seoDescription: null,
      translatedFields: ["name", "heroTitle", "heroDescription", "detailBody"],
    });
    expect(isPublicServiceRecordIndexable(noSeo, "es", "es")).toBe(true);
  });
});

describe("isPublicServiceRecordIndexable — incomplete records are held back", () => {
  it("rejects an empty-HTML body (the live Spain defect)", () => {
    const thin = serviceRecord({
      slug: "consulta-diagnotico-vascular",
      detailBody: "<p><br /></p>",
      summary: null,
      heroDescription: null,
    });
    expect(publicServiceLocaleIssues(thin, "es", "es")).toContain("body");
    expect(isPublicServiceRecordIndexable(thin, "es", "es")).toBe(false);
  });

  it("rejects whitespace and bare headings as content", () => {
    const empty = serviceRecord({
      detailBody: "<h2></h2><p>&nbsp;</p><p>   </p>",
      summary: null,
      heroDescription: null,
    });
    expect(isPublicServiceRecordIndexable(empty, "es", "es")).toBe(false);
  });

  it("rejects a locale with no translation row of its own", () => {
    // resolvedLocale fell back to the market default, so the German URL would
    // have served Spanish content under a German hreflang claim.
    const fellBack = serviceRecord({ resolvedLocale: "es" });
    expect(publicServiceLocaleIssues(fellBack, "de", "es")).toContain("locale");
    expect(isPublicServiceRecordIndexable(fellBack, "de", "es")).toBe(false);
  });

  it("rejects a locale whose body fell through to the market's base columns", () => {
    // A translation row exists (resolvedLocale is `de`) but carries only a
    // name, so the body rendered is the Spanish base column.
    const partial = serviceRecord({
      resolvedLocale: "de",
      translatedFields: ["name"],
      name: "Online-Arztkonsultation",
    });
    expect(publicServiceLocaleIssues(partial, "de", "es")).toContain("body");
    expect(isPublicServiceRecordIndexable(partial, "de", "es")).toBe(false);
  });

  it("rejects internal placeholder copy", () => {
    const draft = serviceRecord({
      detailBody: "<p>TODO: escribir la descripción clínica de este servicio.</p>",
    });
    expect(publicServiceLocaleIssues(draft, "es", "es")).toContain("copy");
  });

  it("rejects non-public kinds, inactive rows and non-PUBLIC visibility", () => {
    expect(isPublicServiceRecordIndexable(serviceRecord({ kind: "PRESCRIPTION" }), "es", "es")).toBe(
      false,
    );
    expect(isPublicServiceRecordIndexable(serviceRecord({ isActive: false }), "es", "es")).toBe(
      false,
    );
    expect(
      isPublicServiceRecordIndexable(serviceRecord({ visibility: "ADMIN_ONLY" }), "es", "es"),
    ).toBe(false);
  });

  it("treats a missing translatedFields payload as in-locale, not as a mass deindex", () => {
    // Frontend deployed ahead of the backend that added the field: fall back to
    // the pre-existing behaviour rather than dropping every URL from the sitemap.
    const legacy = serviceRecord({ translatedFields: null, resolvedLocale: "de" });
    expect(isPublicServiceRecordIndexable(legacy, "de", "es")).toBe(true);
  });
});

describe("future services cannot self-publish", () => {
  // §11: an admin creating a bare service row in ANY market must not get an
  // indexable, sitemap-submitted, hreflang-advertised URL for free.
  const MARKETS = [
    { country: "ie", defaultLocale: "en", kind: "GENERAL" },
    { country: "pt", defaultLocale: "pt", kind: "SPECIALIST" },
    { country: "es", defaultLocale: "es", kind: "GENERAL" },
    { country: "ro", defaultLocale: "ro", kind: "SPECIALIST" },
    { country: "cz", defaultLocale: "cs", kind: "GENERAL" },
    { country: "br", defaultLocale: "pt", kind: "GENERAL" },
  ] as const;

  for (const market of MARKETS) {
    it(`holds back a freshly created empty ${market.kind} service in ${market.country}`, () => {
      const fresh: PublicServiceLocaleRecord = {
        kind: market.kind,
        slug: "new-service",
        isActive: true,
        visibility: "PUBLIC",
        name: "New service",
        summary: null,
        seoTitle: null,
        seoDescription: null,
        heroTitle: null,
        heroDescription: null,
        detailBody: null,
        resolvedLocale: market.defaultLocale,
        translatedFields: ["name"],
      };
      expect(isPublicServiceRecordIndexable(fresh, market.defaultLocale, market.defaultLocale)).toBe(
        false,
      );
    });
  }
});

describe("safeLocalizedServiceMeta", () => {
  it("uses the locale's own SEO title when it has one", () => {
    expect(safeLocalizedServiceMeta(serviceRecord(), "es", "es").title).toBe(
      "Médico Online España | Cita el Mismo Día",
    );
  });

  it("never leaks the market's default-language seoTitle into another locale", () => {
    // The live Spain defect: 20 secondary-locale URLs rendered the Spanish
    // <title> because their translation rows carry no seoTitle of their own.
    const czech = serviceRecord({
      resolvedLocale: "cs",
      name: "Online lékařská konzultace",
      heroTitle: "Online lékařská konzultace ve Španělsku",
      translatedFields: ["name", "heroTitle", "detailBody"],
    });
    const meta = safeLocalizedServiceMeta(czech, "cs", "es");
    expect(meta.title).toBe("Online lékařská konzultace ve Španělsku");
    expect(meta.title).not.toBe(czech.seoTitle);
  });

  it("falls back through heroTitle to the localized name", () => {
    const minimal = serviceRecord({
      resolvedLocale: "ro",
      name: "Consultație medicală online",
      heroTitle: null,
      translatedFields: ["name", "detailBody"],
    });
    expect(safeLocalizedServiceMeta(minimal, "ro", "es").title).toBe("Consultație medicală online");
  });

  it("returns a null description rather than a foreign-language one", () => {
    const noDescription = serviceRecord({
      resolvedLocale: "de",
      heroDescription: null,
      summary: null,
      translatedFields: ["name", "detailBody"],
    });
    expect(safeLocalizedServiceMeta(noDescription, "de", "es").description).toBeNull();
  });
});
