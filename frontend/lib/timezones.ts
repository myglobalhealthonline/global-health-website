/**
 * IANA timezone list for the admin country picker.
 *
 * Curated zones (the countries we serve) are surfaced first; the full IANA
 * set follows via `Intl.supportedValuesOf` so any zone is still reachable.
 * Display elsewhere uses native `Intl.DateTimeFormat({ timeZone })` — this
 * module is only the source of the selectable list + labels.
 */

/**
 * Zone the admin calendar opens in. Admin spans every country, so it defaults
 * to Ireland time and the admin can re-read the grid in any curated zone.
 * Lives here (a plain module) rather than in the calendar's `"use client"` UI
 * so the server page can build its fetch window in the same zone — exports of
 * a client module read from a Server Component are client-reference proxies,
 * not the value.
 */
export const ADMIN_CALENDAR_DEFAULT_TZ = "Europe/Dublin";

export const CURATED_TIME_ZONES = [
  "Europe/Dublin",
  "Europe/London",
  "Europe/Lisbon",
  "Europe/Madrid",
  "Europe/Prague",
  "Europe/Bucharest",
  "Europe/Berlin",
  "UTC",
] as const;

const CURATED_SET = new Set<string>(CURATED_TIME_ZONES);

/**
 * The full IANA zone list. Falls back to the curated set on engines that
 * don't expose `Intl.supportedValuesOf` so the dropdown is never empty.
 */
export function getAllTimeZones(): string[] {
  try {
    const fn = (Intl as unknown as {
      supportedValuesOf?: (key: "timeZone") => string[];
    }).supportedValuesOf;
    const all = fn?.("timeZone");
    if (all && all.length > 0) return all;
  } catch {
    /* fall through to curated */
  }
  return [...CURATED_TIME_ZONES];
}

/** Every zone except the curated ones, sorted — the "All time zones" group. */
export function getNonCuratedTimeZones(): string[] {
  return getAllTimeZones()
    .filter((tz) => !CURATED_SET.has(tz))
    .sort((a, b) => a.localeCompare(b));
}

/** "Europe/Bucharest" → "Europe / Bucharest"; "UTC" stays "UTC". */
export function timeZoneLabel(tz: string): string {
  return tz.includes("/") ? tz.replace(/_/g, " ").replace("/", " / ") : tz;
}
