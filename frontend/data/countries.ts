export type CountryCode = "ie" | "pt" | "sp" | "cz" | "rm";

export type CountryConfig = {
  code: CountryCode;
  name: string;
  legacyHomePath: string;
  teamPath: string;
  generalConsultationPath: string;
  specialistPath: string;
  /** Short label for cards and compact UI */
  label: string;
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
    legacyHomePath: "/home",
    teamPath: "/ireland-team",
    generalConsultationPath: "/general-consultation-ie",
    specialistPath: "/specialty-ie",
  },
  {
    code: "cz",
    name: "Czechia",
    label: "CZ",
    legacyHomePath: "/home-cz",
    teamPath: "/czechia-team",
    generalConsultationPath: "/general-consultation-cz",
    specialistPath: "/specialty-cz",
  },
  {
    code: "pt",
    name: "Portugal",
    label: "PT",
    legacyHomePath: "/home-pt",
    teamPath: "/portugal-team",
    generalConsultationPath: "/general-consultation-pt",
    specialistPath: "/specialty-pt",
  },
  {
    code: "sp",
    name: "Spain",
    label: "ES",
    legacyHomePath: "/home-sp",
    teamPath: "/spain-team",
    generalConsultationPath: "/general-consultation-sp",
    specialistPath: "/specialty-sp",
  },
  {
    code: "rm",
    name: "Romania",
    label: "RO",
    legacyHomePath: "/home-rm",
    teamPath: "/romania-team",
    generalConsultationPath: "/general-consultation-rm",
    specialistPath: "/specialty-rm",
  },
];

export function getCountryByCode(code: CountryCode): CountryConfig | undefined {
  return countries.find((c) => c.code === code);
}
