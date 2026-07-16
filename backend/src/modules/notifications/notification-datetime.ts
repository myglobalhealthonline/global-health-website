import { timezoneLabel } from "../automation/timezone-label.js";

/**
 * Appointment time for an in-portal notification snippet.
 *
 * Snippets are read right next to the portal's appointment pages, so they have
 * to agree with them. A bare `toLocaleString()` here would resolve to the Node
 * host's zone — UTC in production — and print an hour that contradicts the page
 * the reader clicks through to. Always format in the clinic's zone.
 *
 * The zone label is appended because a doctor or admin reading "10:00" has no
 * way to infer which clock it is on, and the notification is often the first
 * place they see the time.
 */
export function formatNotificationDateTime(
  date: Date,
  timeZone: string | null | undefined,
): string {
  const tz = timeZone?.trim() || "UTC";
  try {
    const formatted = new Intl.DateTimeFormat("en-IE", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: tz,
    }).format(date);
    return `${formatted} (${timezoneLabel(tz, "en")})`;
  } catch {
    // Unrecognised zone — an unambiguous instant beats a wrong wall clock.
    return date.toISOString();
  }
}
