import { getAccessToken } from "./google-meet.service.js";
import { stripDoctorHonorific } from "../doctor-name.js";

const GOOGLE_API_TIMEOUT_MS = 10_000;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const DIACRITIC_MARKS = /[̀-ͯ]/g;

function normalizeForMatch(name: string): string {
  return name
    .normalize("NFD")
    .replace(DIACRITIC_MARKS, "")
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Requires every token of the doctor's name (honorific stripped, accents
 * folded) to appear as a whole word in the participant's display name, in
 * any order — tolerates a reordered/nickname-free join, still rejects an
 * unrelated participant who merely shares a surname.
 */
export function buildDoctorNameMatcher(doctorFullName: string): RegExp | null {
  const tokens = normalizeForMatch(stripDoctorHonorific(doctorFullName))
    .split(" ")
    .filter((t) => t.length > 1);
  if (tokens.length === 0) return null;
  const lookaheads = tokens.map((t) => `(?=.*\\b${escapeRegExp(t)}\\b)`).join("");
  return new RegExp(`^${lookaheads}.*$`, "i");
}

export function doctorNameMatchesParticipant(
  doctorFullName: string,
  participantDisplayName: string,
): boolean {
  const matcher = buildDoctorNameMatcher(doctorFullName);
  if (!matcher) return false;
  return matcher.test(normalizeForMatch(participantDisplayName));
}

function extractMeetingCode(meetingUrl: string): string | null {
  try {
    const code = new URL(meetingUrl).pathname.replace(/^\/+/, "").trim();
    return code || null;
  } catch {
    return null;
  }
}

export type DoctorJoinCheckResult =
  | { status: "joined" }
  | { status: "not_joined" }
  | { status: "unknown"; reason: string };

async function fetchJson<T>(url: string, token: string): Promise<{ ok: true; data: T } | { ok: false; reason: string }> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(GOOGLE_API_TIMEOUT_MS),
    });
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) {
    return { ok: false, reason: data.error?.message ?? `HTTP ${res.status}` };
  }
  return { ok: true, data };
}

/**
 * Checks the Meet space's full conference-record history for this space
 * (every session, not just a currently-active call — so a doctor who joined
 * then dropped isn't flagged absent) for a participant whose display name
 * matches the doctor. `unknown` means the Meet API call itself failed;
 * callers should retry later rather than treat it as either outcome.
 */
export async function checkDoctorJoinedMeeting(
  meetingUrl: string,
  doctorFullName: string,
): Promise<DoctorJoinCheckResult> {
  const meetingCode = extractMeetingCode(meetingUrl);
  if (!meetingCode) {
    return { status: "unknown", reason: "Could not parse meeting code from meetingUrl" };
  }

  let token: string;
  try {
    token = await getAccessToken();
  } catch (err) {
    return { status: "unknown", reason: err instanceof Error ? err.message : String(err) };
  }

  const filter = encodeURIComponent(`space.meeting_code = "${meetingCode}"`);
  const records = await fetchJson<{ conferenceRecords?: { name?: string }[] }>(
    `https://meet.googleapis.com/v2/conferenceRecords?filter=${filter}`,
    token,
  );
  if (!records.ok) return { status: "unknown", reason: records.reason };

  const conferenceRecords = records.data.conferenceRecords ?? [];
  if (conferenceRecords.length === 0) return { status: "not_joined" };

  for (const record of conferenceRecords) {
    if (!record.name) continue;
    const participants = await fetchJson<{
      participants?: {
        signedinUser?: { displayName?: string };
        anonymousUser?: { displayName?: string };
      }[];
    }>(`https://meet.googleapis.com/v2/${record.name}/participants`, token);
    if (!participants.ok) return { status: "unknown", reason: participants.reason };

    for (const p of participants.data.participants ?? []) {
      const displayName = p.signedinUser?.displayName ?? p.anonymousUser?.displayName;
      if (displayName && doctorNameMatchesParticipant(doctorFullName, displayName)) {
        return { status: "joined" };
      }
    }
  }

  return { status: "not_joined" };
}
