/** Fixed locale + timezone so SSR and browser render identical strings. */
const DISPLAY_LOCALE = "en-IE";
const DISPLAY_TIME_ZONE = "Europe/Dublin";

export function formatAppDateTime(dateLike: string): string {
  const value = new Date(dateLike);
  if (Number.isNaN(value.getTime())) return dateLike;
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(value);
}

export function formatAppDateTimeShort(dateLike: string): string {
  const value = new Date(dateLike);
  if (Number.isNaN(value.getTime())) return dateLike;
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(value);
}
