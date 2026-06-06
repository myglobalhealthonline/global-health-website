import type { LocaleCode } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

/**
 * Thrown when an admin tries to write a translation for a locale that is
 * not enabled on the parent country (and is not the country's default).
 */
export class LocaleNotSupportedError extends Error {
  constructor(message = "Locale is not enabled for this country") {
    super(message);
    this.name = "LocaleNotSupportedError";
  }
}

/**
 * A locale is writable for a country when it has a CountryLocale row OR it
 * equals the country's defaultLocale. Mirrors the precedent in
 * pages.service.ts so all translatable entities validate the same way.
 */
export async function assertLocaleSupported(countryId: string, locale: LocaleCode): Promise<void> {
  const row = await prisma.countryLocale.findUnique({
    where: { countryId_locale: { countryId, locale } },
    select: { id: true },
  });
  if (row) return;

  const country = await prisma.country.findUnique({
    where: { id: countryId },
    select: { defaultLocale: true },
  });
  if (country?.defaultLocale !== locale) {
    throw new LocaleNotSupportedError();
  }
}
