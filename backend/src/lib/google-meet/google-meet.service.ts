import { env } from "../../config/env.js";

export function isGoogleMeetConfigured(): boolean {
  return Boolean(
    env.GOOGLE_OAUTH_CLIENT_ID?.trim() &&
      env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() &&
      env.GOOGLE_OAUTH_REFRESH_TOKEN?.trim(),
  );
}

async function getAccessToken(): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
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

/**
 * Mints an OPEN Google Meet space and returns its join URI.
 *
 * Why no calendar event: a previous version of this function also POSTed a
 * Google Calendar event using `conferenceData.createRequest`, but the
 * calendar event's auto-minted Meet link was discarded (we returned the
 * separate OPEN space URI instead). The result was an orphan calendar
 * entry with no working Meet link tied to it. The calendar call is
 * dropped here; if a calendar entry is needed later, add it through the
 * scheduling system that owns the appointment, with `entryPoints`
 * pointing at the URI returned here so the link and the event stay in
 * sync.
 *
 * `startTime`, `endTime`, and `serviceTitle` are accepted but not used
 * in space creation today — kept on the signature so callers can pass
 * them once we wire up an integrated calendar entry without another
 * API churn.
 */
export async function createMeetLinkForAppointment(_input: {
  startTime: Date;
  endTime: Date;
  serviceTitle: string;
}): Promise<string> {
  if (!isGoogleMeetConfigured()) {
    throw new Error(
      "Google Meet is not configured. Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REFRESH_TOKEN.",
    );
  }

  const token = await getAccessToken();
  const space = await createOpenSpace(token);
  return space.meetingUri;
}
