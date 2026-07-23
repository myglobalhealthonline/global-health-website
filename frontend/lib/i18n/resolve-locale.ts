import { supportedLocaleCodes, type LocaleCode } from "@/lib/i18n/types";
import type { LocaleResolutionInput } from "@/lib/routing/types";

const localeSet = new Set<LocaleCode>(supportedLocaleCodes);

function normalizeLocale(value?: string | null): string | null {
  if (!value) return null;
  return value.trim().toLowerCase().replace("_", "-");
}

/** Maps a raw locale-ish string to a supported `LocaleCode`, or null. Exported
 *  so callers (e.g. `getPageLocale`) can check "is this explicit value usable"
 *  BEFORE reaching for cookies()/headers() — calling those Next.js dynamic
 *  APIs unconditionally forces the whole route to render dynamically even
 *  when the explicit value (already known from route params) was going to
 *  win anyway. See get-page-locale.ts. */
export function toSupportedLocale(value?: string | null): LocaleCode | null {
  const normalized = normalizeLocale(value);
  if (!normalized) return null;
  const base = normalized.split("-")[0] as LocaleCode;
  if (localeSet.has(base)) return base;
  return null;
}

export function resolveLocale({
  explicitLocale,
  headerLocale,
  cookieLocale,
  countryDefaultLocale = "en",
  acceptLanguageHeader,
}: LocaleResolutionInput): LocaleCode {
  const explicit = toSupportedLocale(explicitLocale);
  if (explicit) return explicit;

  const header = toSupportedLocale(headerLocale);
  if (header) return header;

  const cookie = toSupportedLocale(cookieLocale);
  if (cookie) return cookie;

  if (acceptLanguageHeader) {
    const accepted = acceptLanguageHeader
      .split(",")
      .map((entry) => entry.trim().split(";")[0])
      .map((entry) => toSupportedLocale(entry))
      .find((entry): entry is LocaleCode => Boolean(entry));

    if (accepted) return accepted;
  }

  return toSupportedLocale(countryDefaultLocale) ?? "en";
}
