import type { LocaleCode } from "@prisma/client";
import { detectAutomationLanguage, type AutomationLang } from "./pre-payment-messages.js";

/**
 * Locales the notification templates are actually written in.
 *
 * `LocaleCode` carries DE because the public site serves German pages, but no
 * message template has German copy. Rather than ship half-German notifications
 * (a German subject line over an English body), a German booking is written in
 * English — see `LANG_BY_LOCALE`. Add "de" here only once every template in
 * `pre-payment-messages.ts`, `post-payment-flow`, `appointment-update-
 * notifications`, `refund-notifications`, `doctor-ready-messages` and
 * `doctor-no-show-check` has a German string.
 */
export const NOTIFICATION_LANGS = ["en", "pt", "ro", "cs", "es"] as const;

export type NotificationLang = AutomationLang;

/** LocaleCode (DB/site locale) → the language the message is written in. */
const LANG_BY_LOCALE: Record<LocaleCode, NotificationLang> = {
  EN: "en",
  PT: "pt",
  ES: "es",
  CS: "cs",
  RO: "ro",
  // No German templates exist. English is the deliberate fallback.
  DE: "en",
};

/** The locale a manual booking defaults to when the operator picks nothing. */
const LOCALE_BY_COUNTRY: Record<string, LocaleCode> = {
  ie: "EN",
  uk: "EN",
  gb: "EN",
  pk: "EN",
  pt: "PT",
  br: "PT",
  ro: "RO",
  cz: "CS",
  es: "ES",
  sp: "ES",
  de: "DE",
};

/**
 * The language to write a patient-facing message in.
 *
 * `notificationLocale` is the booking's own recorded choice — the site locale a
 * website customer booked in, or the operator's dropdown pick on a manual
 * booking — and always wins. Everything else falls back to the pre-existing
 * country/service-name derivation, so rows predating the column (null) behave
 * exactly as they did before.
 */
export function resolveNotificationLang(input: {
  notificationLocale?: LocaleCode | null;
  countryCode?: string | null;
  serviceName?: string | null;
}): NotificationLang {
  if (input.notificationLocale) {
    return LANG_BY_LOCALE[input.notificationLocale] ?? "en";
  }
  return detectAutomationLanguage({
    countryCode: input.countryCode,
    serviceName: input.serviceName,
  });
}

/**
 * Default dropdown selection for a manual booking: the locale of the country
 * the consultation is being booked in. Unknown country → EN.
 */
export function defaultNotificationLocaleForCountry(
  countryCode?: string | null,
): LocaleCode {
  const code = countryCode?.trim().toLowerCase();
  return (code && LOCALE_BY_COUNTRY[code]) || "EN";
}

/** Narrow arbitrary input (route body, legacy string column) to a LocaleCode. */
export function parseNotificationLocale(value?: string | null): LocaleCode | null {
  const upper = value?.trim().toUpperCase();
  if (!upper) return null;
  return upper in LANG_BY_LOCALE ? (upper as LocaleCode) : null;
}
