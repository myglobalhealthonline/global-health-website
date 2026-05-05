import type { CountryCode, CountryConfig } from "@/data/countries";
import type { LocaleCode } from "@/lib/i18n/types";

export type CountryRuntimeContext = {
  country: CountryConfig;
  reason: "domain" | "legacy-path" | "fallback";
};

export type ResolveCountryInput = {
  host?: string | null;
  pathname?: string | null;
  defaultCountryCode?: CountryCode;
};

export type LocaleResolutionInput = {
  explicitLocale?: string | null;
  countryDefaultLocale?: LocaleCode;
  acceptLanguageHeader?: string | null;
};

export type SiteContextInput = {
  host?: string | null;
  pathname?: string | null;
  explicitLocale?: string | null;
  acceptLanguageHeader?: string | null;
};
