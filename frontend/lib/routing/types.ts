import type { CountryCode, CountryConfig } from "@/data/countries";
import type { LocaleCode } from "@/lib/i18n/types";

export type CountryRuntimeContext = {
  country: CountryConfig;
  reason: "path-slug" | "domain" | "legacy-path" | "fallback";
};

export type ResolveCountryInput = {
  host?: string | null;
  pathname?: string | null;
  defaultCountryCode?: CountryCode;
};

export type LocaleResolutionInput = {
  explicitLocale?: string | null;
  headerLocale?: string | null;
  cookieLocale?: string | null;
  countryDefaultLocale?: LocaleCode;
  acceptLanguageHeader?: string | null;
};

export type SiteContextInput = {
  host?: string | null;
  pathname?: string | null;
  explicitCountryCode?: CountryCode;
  explicitLocale?: string | null;
  headerLocale?: string | null;
  acceptLanguageHeader?: string | null;
  cookieLocale?: string | null;
};

export type RequestRoutingContext = {
  host: string | null;
  pathname: string;
  countryCode: CountryCode;
  locale: LocaleCode;
  /** Locale that was carried explicitly in the URL path, if any. */
  pathLocale: string | null;
  isLegacyRoute: boolean;
  matchedLegacyRoute: string | null;
};
