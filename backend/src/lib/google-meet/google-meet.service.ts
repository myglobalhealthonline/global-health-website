import { env } from "../../config/env.js";

// Hard timeout for every Google API call so a hung request can't pin the
// admin route handler (and its DB connection) open indefinitely.
const GOOGLE_API_TIMEOUT_MS = 10_000;

export function isGoogleMeetConfigured(): boolean {
  return Boolean(
    env.GOOGLE_OAUTH_CLIENT_ID?.trim() &&
      env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() &&
      env.GOOGLE_OAUTH_REFRESH_TOKEN?.trim(),
  );
}

export async function getAccessToken(): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(GOOGLE_API_TIMEOUT_MS),
  });

  const data = (await response.json()) as {
    access_token?: string;
    error_description?: string;
    error?: string;
  };
  if (!response.ok || !data.access_token) {
    throw new Error(`OAuth Failed: ${data.error_description || data.error || `HTTP ${response.status}`}`);
  }
  return data.access_token;
}

async function createOpenSpace(token: string): Promise<{ meetingUri: string }> {
  const response = await fetch("https://meet.googleapis.com/v2/spaces", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      config: {
        accessType: "OPEN",
        entryPointAccess: "ALL",
      },
    }),
    signal: AbortSignal.timeout(GOOGLE_API_TIMEOUT_MS),
  });

  const data = (await response.json()) as {
    meetingUri?: string;
    error?: { message?: string };
  };
  if (!response.ok || !data.meetingUri) {
    throw new Error(
      `Meet API Error: ${data.error?.message ?? `HTTP ${response.status}`}`,
    );
  }
  return { meetingUri: data.meetingUri };
}

function toGoogleDateTime(date: Date): string {
  return date.toISOString();
}

/**
 * Creates an OPEN Google Meet space and a calendar event titled with
 * `serviceTitle`. The Meet join URL is in the description and location.
 * When `attendeeEmails` are provided, Google sends calendar invites to
 * those attendees (`sendUpdates=all`).
 */
/** Meet link plus the calendar event that carries it. The event id is what
 *  makes the booking's calendar entry removable later — without it a cancelled
 *  consultation leaves the doctor blocked out for an appointment that is not
 *  happening. */
export type CalendarEventForAppointment = { meetLink: string; eventId: string | null };

/** Back-compat wrapper: callers that only need the join link. */
export async function createMeetLinkForAppointment(input: {
  startTime: Date;
  endTime: Date;
  serviceTitle: string;
  attendeeEmails?: string[];
}): Promise<string> {
  return (await createCalendarEventForAppointment(input)).meetLink;
}

export async function createCalendarEventForAppointment(input: {
  startTime: Date;
  endTime: Date;
  serviceTitle: string;
  attendeeEmails?: string[];
}): Promise<CalendarEventForAppointment> {
  if (!isGoogleMeetConfigured()) {
    throw new Error(
      "Google Meet is not configured. Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REFRESH_TOKEN.",
    );
  }

  const token = await getAccessToken();
  const spaceData = await createOpenSpace(token);
  const meetLink = spaceData.meetingUri;
  const summary = input.serviceTitle || "Global Health Appointment";

  const attendees = [...new Set(
    (input.attendeeEmails ?? [])
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0 && email.includes("@")),
  )].map((email) => ({ email }));

  const calendarId = env.GOOGLE_CALENDAR_ID?.trim() || "primary";
  const event = {
    summary,
    description: `Service: ${summary}\n\nJoin Google Meet:\n${meetLink}`,
    location: meetLink,
    start: {
      dateTime: toGoogleDateTime(input.startTime),
      timeZone: "GMT",
    },
    end: {
      dateTime: toGoogleDateTime(input.endTime),
      timeZone: "GMT",
    },
    ...(attendees.length > 0 ? { attendees } : {}),
  };

  const sendUpdates = attendees.length > 0 ? "?sendUpdates=all" : "";
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events${sendUpdates}`;

  const calResponse = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
    signal: AbortSignal.timeout(GOOGLE_API_TIMEOUT_MS),
  });

  const calData = (await calResponse.json()) as {
    id?: string;
    error?: { message?: string };
  };
  if (!calResponse.ok) {
    throw new Error(
      `Calendar API Error: ${calData.error?.message ?? JSON.stringify(calData)}`,
    );
  }

  return { meetLink, eventId: calData.id ?? null };
}

/**
 * Remove a booking's calendar event — used when the consultation is cancelled.
 *
 * A cancelled consultation used to leave its event standing, so the doctor's
 * calendar kept showing them busy for an appointment nobody would attend, and
 * any attendee kept a live invite. Google answers 404/410 for an event that is
 * already gone; both count as success here, so cancelling twice is a no-op
 * rather than an error.
 */
export async function deleteCalendarEventForAppointment(eventId: string): Promise<void> {
  if (!isGoogleMeetConfigured() || !eventId.trim()) return;
  const token = await getAccessToken();
  const calendarId = env.GOOGLE_CALENDAR_ID?.trim() || "primary";
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
    calendarId,
  )}/events/${encodeURIComponent(eventId)}?sendUpdates=all`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(GOOGLE_API_TIMEOUT_MS),
  });
  if (res.ok || res.status === 404 || res.status === 410) return;
  const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  throw new Error(`Calendar API Error (delete): ${body.error?.message ?? res.status}`);
}
