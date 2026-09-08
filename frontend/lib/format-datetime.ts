/**
 * Timezone-aware date/time formatters used across patient, doctor, and
 * admin portals.
 *
 * Backward-compat: calling any of these without a `tz` argument keeps
 * the historical Europe/Dublin behavior so existing rendering doesn't
 * shift. New call sites — emails, patient portal, doctor dual-tz —
 * pass the appointment's `patientTimezone` (IANA) explicitly.
 *
 * The four base formatters mirror what they previously emitted; the
 * fifth, `formatAppDualTz`, is the doctor-portal "14:30 IST · (15:30
 * patient time, Bucharest)" pattern from the booking-lift plan.
 */

import { timezoneLabel } from "./timezone-label";

const DISPLAY_LOCALE = "en-IE";
const DEFAULT_TIME_ZONE = "Europe/Dublin";
const FORMATTER_CACHE_LIMIT = 48;
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function resolveTz(tz: string | undefined | null): string {
  // Falsy guard handles "", null, undefined, and "UTC" (which should
  // still render as UTC — accepted as-is by Intl).
  if (!tz || typeof tz !== "string") return DEFAULT_TIME_ZONE;
  return tz;
}

function formatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  const cached = formatterCache.get(key);
  if (cached) {
    formatterCache.delete(key);
    formatterCache.set(key, cached);
    return cached;
  }
  const created = new Intl.DateTimeFormat(locale, options);
  formatterCache.set(key, created);
  if (formatterCache.size > FORMATTER_CACHE_LIMIT) {
    const oldest = formatterCache.keys().next().value;
    if (oldest) formatterCache.delete(oldest);
  }
  return created;
}

export function formatAppDateTime(
  dateLike: string,
  tz?: string | null,
): string {
  const value = new Date(dateLike);
  if (Number.isNaN(value.getTime())) return dateLike;
  return formatter(DISPLAY_LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: resolveTz(tz),
  }).format(value);
}

export function formatAppDateTimeShort(
  dateLike: string,
  tz?: string | null,
): string {
  const value = new Date(dateLike);
  if (Number.isNaN(value.getTime())) return dateLike;
  return formatter(DISPLAY_LOCALE, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: resolveTz(tz),
  }).format(value);
}

export function formatAppDate(
  dateLike: string,
  tz?: string | null,
): string {
  const value = new Date(dateLike);
  if (Number.isNaN(value.getTime())) return dateLike;
  return formatter(DISPLAY_LOCALE, {
    dateStyle: "medium",
    timeZone: resolveTz(tz),
  }).format(value);
}

/**
 * Day + month only, no year — for the compact date chip under the time on
 * appointment cards, where `formatAppDate`'s year would overflow the slot.
 */
export function formatAppDayMonth(
  dateLike: string,
  tz?: string | null,
): string {
  const value = new Date(dateLike);
  if (Number.isNaN(value.getTime())) return dateLike;
  return formatter(DISPLAY_LOCALE, {
    month: "short",
    day: "2-digit",
    timeZone: resolveTz(tz),
  }).format(value);
}

export function formatAppTime(
  dateLike: string,
  tz?: string | null,
): string {
  const value = new Date(dateLike);
  if (Number.isNaN(value.getTime())) return dateLike;
  return formatter(DISPLAY_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: resolveTz(tz),
  }).format(value);
}

/**
 * `formatAppDateTime` in a given zone, tagged with the country that names
 * that zone the exact way patient notifications do ("21 Jul 2026, 14:00
 * (Portugal)"). Mirrors the backend `formatDeadline` + `timezoneLabel`, so
 * the admin reads a booking's time in the same words the patient was told.
 * Multi-timezone countries fall back to the IANA city; a missing zone → UTC.
 */
export function formatAppDateTimeWithZone(
  dateLike: string,
  tz?: string | null,
): string {
  const value = new Date(dateLike);
  if (Number.isNaN(value.getTime())) return dateLike;
  return `${formatAppDateTime(dateLike, tz)} (${timezoneLabel(tz, DISPLAY_LOCALE)})`;
}

export type AppointmentDayBucket = "today" | "tomorrow" | "later";

export function dayKeyInTz(value: Date, tz: string): string {
  const parts = formatter("en", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: tz,
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Calendar days in the clinic zone, safe across daylight-saving changes. */
export function clinicTodayTomorrowKeys(now: Date, tz: string): [string, string] {
  const today = dayKeyInTz(now, tz);
  const [year, month, day] = today.split("-").map(Number);
  const tomorrow = new Date(Date.UTC(year, month - 1, day + 1));
  return [today, tomorrow.toISOString().slice(0, 10)];
}

/**
 * Buckets an appointment's date against "today" in the resolved tz, for
 * grouping appointment lists by day (doctor portal appointments list +
 * dashboard). `dayKey` is a stable `YYYY-MM-DD` string for grouping/sorting;
 * `label` is a ready-to-render weekday+date string for the `"later"` bucket
 * only — `"today"`/`"tomorrow"` are translated by the caller instead, since
 * dates elsewhere in this file are deliberately not locale-translated
 * (`DISPLAY_LOCALE` stays `en-IE` regardless of UI language).
 */
export function getAppointmentDayBucket(
  dateLike: string,
  tz?: string | null,
): { bucket: AppointmentDayBucket; dayKey: string; label: string } {
  const zone = resolveTz(tz);
  const value = new Date(dateLike);
  const [todayKey, tomorrowKey] = clinicTodayTomorrowKeys(new Date(), zone);
  const dayKey = Number.isNaN(value.getTime()) ? "" : dayKeyInTz(value, zone);
  const bucket: AppointmentDayBucket =
    dayKey === todayKey ? "today" : dayKey === tomorrowKey ? "tomorrow" : "later";
  const label =
    bucket === "later" && dayKey
      ? formatter(DISPLAY_LOCALE, {
          weekday: "short",
          month: "short",
          day: "2-digit",
          timeZone: zone,
        }).format(value)
      : "";
  return { bucket, dayKey, label };
}

/**
 * Dual-timezone string for the doctor portal: doctor-local time first,
 * patient-local time and short IANA city tag in parens.
 *
 *   "14:30 · (15:30 patient time, Bucharest)"
 *
 * If `patientTz` matches `doctorTz` (or is missing), returns just the
 * doctor-local time to avoid noisy "14:30 · (14:30 patient time)" rows.
 */
export function formatAppDualTz(
  dateLike: string,
  doctorTz: string | null | undefined,
  patientTz: string | null | undefined,
): string {
  const value = new Date(dateLike);
  if (Number.isNaN(value.getTime())) return dateLike;
  const doctorIana = resolveTz(doctorTz);
  const docTime = formatter(DISPLAY_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: doctorIana,
  }).format(value);
  if (!patientTz || patientTz === doctorIana) return docTime;
  const patTime = formatter(DISPLAY_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: patientTz,
  }).format(value);
  // Last path segment of an IANA name is the city ("Europe/Bucharest"
  // → "Bucharest"); fall back to the raw string when not present.
  const city = patientTz.includes("/")
    ? patientTz.slice(patientTz.lastIndexOf("/") + 1).replace(/_/g, " ")
    : patientTz;
  return `${docTime} · (${patTime} patient time, ${city})`;
}
