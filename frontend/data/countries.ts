import type { LocaleCode } from "@/lib/i18n/types";

/**
 * Internal short code for a country. Originally a literal union for the
 * five seeded markets (`ie | pt | sp | cz | rm`); widened to `string` so
 * admins can spin up new countries via `/admin/countries` and have them
 * surface across the public site without a code release.
 *
 * Format constraint (enforced at the schema level, not the type system):
 * 2–8 lowercase alphanum, must start with a letter. Anything else is
 * rejected upstream by `countryCodeSchema` on the backend.
 */
export type CountryCode = string;

export type CountryConfig = {
  code: CountryCode;
  name: string;
  legacyHomePath: string;
  teamPath: string;
  generalConsultationPath: string;
  specialistPath: string;
  /** Short label for cards and compact UI */
  label: string;
  /**
   * URL slug. Falls back to `code` for admin-added countries that haven't
   * picked a friendlier slug yet. Seeded countries override this to a full
   * English noun (`ireland`, `portugal`, …) for SEO.
   */
  slug: string;
  defaultLocale: LocaleCode;
  supportedLocales: LocaleCode[];
};

/**
 * Transitional seed data for country routing.
 * Replace with DB reads from Prisma in subsequent content service layer.
 */
export const countries: CountryConfig[] = [
  {
    code: "ie",
    name: "Ireland",
    label: "IE",
    slug: "ireland",
    defaultLocale: "en",
    supportedLocales: ["en", "pt", "es"],
    legacyHomePath: "/home",
    teamPath: "/ireland-team",
    generalConsultationPath: "/general-consultation-ie",
    specialistPath: "/specialty-ie",
  },
  {
    code: "cz",
    name: "Czechia",
    label: "CZ",
    slug: "czechia",
    defaultLocale: "cs",
    supportedLocales: ["cs", "en"],
    legacyHomePath: "/home-cz",
    teamPath: "/czechia-team",
    generalConsultationPath: "/general-consultation-cz",
    specialistPath: "/specialty-cz",
  },
  {
    code: "pt",
    name: "Portugal",
    label: "PT",
    slug: "portugal",
    defaultLocale: "pt",
    supportedLocales: ["pt", "en"],
    legacyHomePath: "/home-pt",
    teamPath: "/portugal-team",
    generalConsultationPath: "/general-consultation-pt",
    specialistPath: "/specialty-pt",
  },
  {
    code: "sp",
    name: "Spain",
    label: "ES",
    slug: "spain",
    defaultLocale: "es",
    supportedLocales: ["es", "en"],
    legacyHomePath: "/home-sp",
    teamPath: "/spain-team",
    generalConsultationPath: "/general-consultation-sp",
    specialistPath: "/specialty-sp",
  },
  {
    code: "rm",
    name: "Romania",
    label: "RO",
    slug: "romania",
    defaultLocale: "ro",
    supportedLocales: ["ro", "en"],
    legacyHomePath: "/home-rm",
    teamPath: "/romania-team",
    generalConsultationPath: "/general-consultation-rm",
    specialistPath: "/specialty-rm",
  },
];

export function getCountryByCode(code: CountryCode): CountryConfig | undefined {
  return countries.find((c) => c.code === code);
}
