import type { CountryCode } from "@/data/countries";
import type { LocaleCode } from "@/lib/i18n/types";

export type DomainConfig = {
  countryCode: CountryCode;
  defaultLocale: LocaleCode;
  enabled: boolean;
};

/**
 * Centralized domain map for country+locale defaults.
 * Keep `enabled: false` on example domains until explicitly activated.
 */
export const domainMap: Record<string, DomainConfig> = {
  "globalhealth.ie": { countryCode: "ie", defaultLocale: "en", enabled: true },
  "globalhealth.pt": { countryCode: "pt", defaultLocale: "pt", enabled: true },
  "ie.myglobalhealth.online": { countryCode: "ie", defaultLocale: "en", enabled: true },
  "pt.myglobalhealth.online": { countryCode: "pt", defaultLocale: "pt", enabled: true },
  "es.myglobalhealth.online": { countryCode: "sp", defaultLocale: "es", enabled: true },
  "cz.myglobalhealth.online": { countryCode: "cz", defaultLocale: "cs", enabled: true },
  "ro.myglobalhealth.online": { countryCode: "rm", defaultLocale: "ro", enabled: true },

  // Future custom domains (disabled by default)
  "ireland.example.com": { countryCode: "ie", defaultLocale: "en", enabled: false },
  "portugal.example.com": { countryCode: "pt", defaultLocale: "pt", enabled: false },
};

export function getEnabledDomainConfig(host?: string | null): DomainConfig | null {
  if (!host) return null;
  const normalized = host.toLowerCase().replace(/:\d+$/, "");
  const config = domainMap[normalized];
  if (!config || !config.enabled) return null;
  return config;
}
