/**
 * The language patient-facing notifications (payment links, reminders,
 * confirmations, "doctor is ready") are written in for one booking.
 *
 * Website bookings take it from the `[lang]` segment the customer was actually
 * browsing in. Admin/doctor manual bookings pick it from a dropdown that
 * pre-selects the booking country's own locale.
 */
export const NOTIFICATION_LOCALES = ["EN", "PT", "ES", "CS", "RO", "DE"] as const;

export type NotificationLocale = (typeof NOTIFICATION_LOCALES)[number];

/**
 * Endonyms — a language picker is read by someone who speaks the language
 * being picked, so each option is written in that language rather than in the
 * operator's UI language.
 *
 * DE is offered because the site serves German pages and the column records
 * what the patient actually reads. The backend has no German message templates
 * yet, so a DE booking receives English copy — see `resolveNotificationLang`.
 */
export const NOTIFICATION_LOCALE_LABEL: Record<NotificationLocale, string> = {
  EN: "English",
  PT: "Português",
  ES: "Español",
  CS: "Čeština",
  RO: "Română",
  DE: "Deutsch",
};

/**
 * Narrow arbitrary text to a locale code. Unknown/missing → undefined, which
 * leaves the server to fall back to the booking country.
 *
 * Used both on the `[lang]` route segment (website checkout) and on a submitted
 * form value (the admin server action re-narrows what the client posted, so a
 * bypassed client cannot write an arbitrary string into the column).
 */
export function parseNotificationLocale(
  value?: string | null,
): NotificationLocale | undefined {
  const upper = value?.trim().toUpperCase();
  return NOTIFICATION_LOCALES.includes(upper as NotificationLocale)
    ? (upper as NotificationLocale)
    : undefined;
}

/** Reads better at the checkout call site, where the input IS the `[lang]` segment. */
export const notificationLocaleFromLang = parseNotificationLocale;

/**
 * Default dropdown selection for a manual booking: the locale of the country
 * the consultation is being booked in. Mirrors
 * `defaultNotificationLocaleForCountry` on the backend — keep the two in step.
 */
const LOCALE_BY_COUNTRY: Record<string, NotificationLocale> = {
  ie: "EN",
  ireland: "EN",
  uk: "EN",
  gb: "EN",
  pk: "EN",
  pakistan: "EN",
  pt: "PT",
  portugal: "PT",
  br: "PT",
  brazil: "PT",
  ro: "RO",
  romania: "RO",
  cz: "CS",
  czechia: "CS",
  "czech-republic": "CS",
  es: "ES",
  sp: "ES",
  spain: "ES",
  de: "DE",
  germany: "DE",
};

export function defaultNotificationLocaleForCountry(
  countryCode?: string | null,
): NotificationLocale {
  const code = countryCode?.trim().toLowerCase();
  return (code && LOCALE_BY_COUNTRY[code]) || "EN";
}
