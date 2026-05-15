import type { LocaleCode } from "@/lib/i18n/types";

/**
 * Display names for each supported locale, both in English and in the locale's
 * own language. Adding a new locale = extend the `LocaleCode` union in
 * `types.ts` + the Prisma enum + add a row here.
 *
 * Keep this map dumb-and-flat so new locales can be added without touching the
 * components that read from it.
 */
export const LOCALE_DISPLAY: Record<
  LocaleCode,
  { english: string; native: string; hello: string }
> = {
  en: { english: "English", native: "English", hello: "Hello." },
  pt: { english: "Portuguese", native: "Português", hello: "Olá." },
  es: { english: "Spanish", native: "Español", hello: "Hola." },
  cs: { english: "Czech", native: "Čeština", hello: "Ahoj." },
  ro: { english: "Romanian", native: "Română", hello: "Salut." },
  de: { english: "German", native: "Deutsch", hello: "Hallo." },
};

export function localeDisplayName(
  locale: LocaleCode,
  style: "english" | "native" = "native",
): string {
  return LOCALE_DISPLAY[locale]?.[style] ?? locale.toUpperCase();
}
