const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function zonedParts(date: Date, timeZone: string): Record<string, string> | null {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    return Object.fromEntries(
      formatter
        .formatToParts(date)
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]),
    );
  } catch {
    return null;
  }
}

function wallTime(parts: Record<string, string>): string {
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function offsetMinutes(date: Date, timeZone: string): number | null {
  const parts = zonedParts(date, timeZone);
  if (!parts) return null;
  const representedAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((representedAsUtc - date.getTime()) / 60_000);
}

/** Render a stored UTC instant for a `datetime-local` input in an IANA zone. */
export function utcInstantToZonedInput(
  instant: string | null | undefined,
  timeZone: string,
): string {
  if (!instant) return "";
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return "";
  const parts = zonedParts(date, timeZone);
  return parts ? wallTime(parts) : "";
}

/**
 * Interpret a `datetime-local` value as wall time in `timeZone` and return an
 * explicit UTC instant for the backend. Nonexistent DST times are rejected.
 * If a fall-back hour occurs twice, the earlier instant is chosen
 * deterministically.
 */
export function zonedInputToUtcInstant(local: string, timeZone: string): string {
  const match = LOCAL_DATE_TIME.exec(local);
  if (!match) return "";

  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  const normalized = new Date(wallClockAsUtc);
  if (
    normalized.getUTCFullYear() !== year ||
    normalized.getUTCMonth() !== month - 1 ||
    normalized.getUTCDate() !== day ||
    normalized.getUTCHours() !== hour ||
    normalized.getUTCMinutes() !== minute
  ) {
    return "";
  }

  // Sample both sides of the wall time so a DST transition contributes both
  // possible offsets. Round-tripping the candidates detects skipped hours.
  const offsets = new Set<number>();
  for (const deltaHours of [-36, -12, 0, 12, 36]) {
    const offset = offsetMinutes(
      new Date(wallClockAsUtc + deltaHours * 60 * 60 * 1000),
      timeZone,
    );
    if (offset === null) return "";
    offsets.add(offset);
  }

  const candidates = [...offsets]
    .map((offset) => new Date(wallClockAsUtc - offset * 60_000))
    .filter((candidate) => {
      const parts = zonedParts(candidate, timeZone);
      return parts !== null && wallTime(parts) === local;
    })
    .sort((a, b) => a.getTime() - b.getTime());

  return candidates[0]?.toISOString() ?? "";
}
