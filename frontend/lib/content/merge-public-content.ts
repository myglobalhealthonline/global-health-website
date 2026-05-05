import type { CountryCode, CountryConfig } from "@/data/countries";
import type { LocaleCode } from "@/lib/i18n/types";

const KNOWN_COUNTRY_CODES = new Set<CountryCode>(["ie", "pt", "sp", "cz", "rm"]);

const BACKEND_LOCALE_MAP: Record<string, LocaleCode> = {
  EN: "en",
  PT: "pt",
  ES: "es",
  CS: "cs",
  RO: "ro",
  DE: "de",
};

const KNOWN_LOCALE = new Set<LocaleCode>(["en", "pt", "es", "cs", "ro", "de"]);

export function normalizeBackendLocale(value: unknown): LocaleCode | undefined {
  if (typeof value !== "string") return undefined;
  const upper = value.toUpperCase();
  return BACKEND_LOCALE_MAP[upper] ?? (KNOWN_LOCALE.has(value as LocaleCode) ? (value as LocaleCode) : undefined);
}

export function isSafePublicAssetPath(path: string): boolean {
  const t = path.trim();
  if (!t.startsWith("/")) return false;
  if (t.startsWith("//")) return false;
  if (t.includes("..")) return false;
  return true;
}

export function mergeDefined<T extends Record<string, unknown>>(base: T, patch: Partial<T>): T {
  const out = { ...base };
  for (const key of Object.keys(patch) as (keyof T)[]) {
    const v = patch[key];
    if (v !== undefined && v !== null && v !== "") {
      (out as Record<string, unknown>)[key as string] = v as unknown;
    }
  }
  return out;
}

/** All four legacy routing paths must be present and absolute before we trust backend routing fields. */
export function areLegacyCountryPathsComplete(paths: {
  legacyHomePath?: unknown;
  teamPath?: unknown;
  generalConsultationPath?: unknown;
  specialistConsultationPath?: unknown;
}): boolean {
  const check = (v: unknown) => typeof v === "string" && v.startsWith("/") && !v.startsWith("//") && v.length > 1;
  return (
    check(paths.legacyHomePath) &&
    check(paths.teamPath) &&
    check(paths.generalConsultationPath) &&
    check(paths.specialistConsultationPath)
  );
}

export function mergeCountryConfigWithBackend(
  fallback: CountryConfig,
  backend: {
    name?: string;
    legacyHomePath?: string;
    teamPath?: string;
    generalConsultationPath?: string;
    specialistConsultationPath?: string;
    defaultLocale?: LocaleCode;
    supportedLocales?: LocaleCode[];
  },
): CountryConfig {
  const pathsOk = areLegacyCountryPathsComplete({
    legacyHomePath: backend.legacyHomePath,
    teamPath: backend.teamPath,
    generalConsultationPath: backend.generalConsultationPath,
    specialistConsultationPath: backend.specialistConsultationPath,
  });

  const pathMerge = pathsOk
    ? {
        legacyHomePath: backend.legacyHomePath as string,
        teamPath: backend.teamPath as string,
        generalConsultationPath: backend.generalConsultationPath as string,
        specialistPath: backend.specialistConsultationPath as string,
      }
    : {
        legacyHomePath: fallback.legacyHomePath,
        teamPath: fallback.teamPath,
        generalConsultationPath: fallback.generalConsultationPath,
        specialistPath: fallback.specialistPath,
      };

  return {
    ...fallback,
    ...pathMerge,
    name: backend.name ?? fallback.name,
    ...(backend.defaultLocale ? { defaultLocale: backend.defaultLocale } : {}),
    ...(backend.supportedLocales && backend.supportedLocales.length > 0
      ? { supportedLocales: backend.supportedLocales }
      : {}),
  };
}

export function isKnownCountryCode(code: unknown): code is CountryCode {
  return typeof code === "string" && KNOWN_COUNTRY_CODES.has(code as CountryCode);
}
