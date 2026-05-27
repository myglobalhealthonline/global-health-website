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

const DISPLAY_LOCALE = "en-IE";
const DEFAULT_TIME_ZONE = "Europe/Dublin";

function resolveTz(tz: string | undefined | null): string {
  // Falsy guard handles "", null, undefined, and "UTC" (which should
  // still render as UTC — accepted as-is by Intl).
  if (!tz || typeof tz !== "string") return DEFAULT_TIME_ZONE;
  return tz;
}

export function formatAppDateTime(
  dateLike: string,
  tz?: string | null,
): string {
  const value = new Date(dateLike);
  if (Number.isNaN(value.getTime())) return dateLike;
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
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
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
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
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    dateStyle: "medium",
    timeZone: resolveTz(tz),
  }).format(value);
}

export function formatAppTime(
  dateLike: string,
  tz?: string | null,
): string {
  const value = new Date(dateLike);
  if (Number.isNaN(value.getTime())) return dateLike;
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: resolveTz(tz),
  }).format(value);
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
  const docTime = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: doctorIana,
  }).format(value);
  if (!patientTz || patientTz === doctorIana) return docTime;
  const patTime = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
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
