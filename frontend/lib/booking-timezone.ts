import { getCountryByCode } from "@/data/countries";

/**
 * The clinic zone a country's bookings are read in — the frontend mirror of
 * `BookingSetting.timezone`, which the backend resolves per country for slot
 * generation and every patient-facing time string.
 *
 * Admin surfaces used to hardcode `Europe/Dublin` as "the clinic zone", so a
 * Czech or Brazilian booking was captioned in Irish time. Anything rendering a
 * booking without a server-supplied zone should resolve it from the booking's
 * own country through here instead.
 *
 * `sp` / `rm` are legacy aliases of ES / RO that still appear on old rows.
 */
const LEGACY_CODE_ALIASES: Record<string, string> = { sp: "es", rm: "ro" };

export function bookingTimezoneForCountry(
  countryCode: string | null | undefined,
  /** Used when the code names no country we know — never a real clinic zone. */
  fallback = "UTC",
): string {
  const raw = countryCode?.trim().toLowerCase();
  if (!raw) return fallback;
  const code = LEGACY_CODE_ALIASES[raw] ?? raw;
  return getCountryByCode(code)?.bookingTimezone ?? fallback;
}

/**
 * The city an IANA zone names ("Europe/Prague" → "Prague"), for labelling a
 * field the admin is typing into. Not a country name on purpose: the label
 * sits next to a clock, and the city is what identifies the wall time.
 */
export function timezoneCity(timeZone: string): string {
  return timeZone.includes("/")
    ? timeZone.slice(timeZone.lastIndexOf("/") + 1).replace(/_/g, " ")
    : timeZone;
}
