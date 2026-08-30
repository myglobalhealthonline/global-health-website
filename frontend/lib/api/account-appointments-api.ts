import "server-only";

import { cookies } from "next/headers";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export type AccountAppointment = {
  id: string;
  countryCode: string;
  consultationType: string;
  status: string;
  scheduledAt: string | null;
  meetingUrl: string | null;
  paymentStatus: string;
  amountCents: number | null;
  currencyCode: string | null;
  createdAt: string;
  updatedAt: string;
  fullName: string;
  email: string;
  phone: string | null;
  notesPreview: string | null;
  /** For IN_PERSON appointments — either a joined clinic name/city or a
   *  free-text locationAddress. UI renders a "Where" block from these. */
  consultationMode?: string | null;
  clinicName?: string | null;
  clinicCity?: string | null;
  locationAddress?: string | null;
  /** IANA tz the patient was in at booking time. Used to render
   *  scheduledAt in their local time on the bookings list + emails. */
  patientTimezone?: string | null;
  /** Assigned doctor's full name (null until a doctor is assigned). Shown on
   *  the patient calendar so they know who they're meeting. */
  doctorName?: string | null;
  /** Human-facing order reference (e.g. ORD-000001), null when unlinked. */
  orderNumber?: string | null;
};

type ApiResult<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message: string; status?: number };

async function buildCookieHeader() {
  try {
    const store = await cookies();
    return store
      .getAll()
      .map((entry) => `${entry.name}=${entry.value}`)
      .join("; ");
  } catch {
    return "";
  }
}

export async function fetchAccountAppointments(): Promise<ApiResult<{ items: AccountAppointment[] }>> {
  // Use the server-side backend origin helper so we honour
  // `API_BASE_URL` first (private/internal Railway URL) and fall back to
  // `NEXT_PUBLIC_API_URL`. The old code read only the public env, so the
  // patient portal showed "unavailable" on deploys that exposed only
  // the private URL.
  const apiUrl = getBackendOrigin();
  if (!apiUrl) return { ok: false, message: "Public API URL is not configured" };
  const cookieHeader = await buildCookieHeader();
  try {
    const response = await fetch(`${apiUrl}/api/account/appointments`, {
      method: "GET",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });
    const json = (await response.json()) as {
      ok?: boolean;
      data?: { items?: AccountAppointment[] };
      message?: string;
    };
    if (!response.ok || !json.ok || !json.data?.items) {
      return {
        ok: false,
        status: response.status,
        message: json.message ?? "Unable to load appointment history",
      };
    }
    return { ok: true, data: { items: json.data.items }, message: json.message };
  } catch {
    return { ok: false, message: "Backend is unavailable" };
  }
}

export type TrustpilotReminderData = {
  showCta: boolean;
  trustpilotUrl: string | null;
  completedAt: string | null;
};

export async function fetchTrustpilotReminder(): Promise<TrustpilotReminderData> {
  const apiUrl = getBackendOrigin();
  if (!apiUrl) return { showCta: false, trustpilotUrl: null, completedAt: null };
  const cookieHeader = await buildCookieHeader();
  try {
    const res = await fetch(`${apiUrl}/api/account/trustpilot-reminder`, {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });
    const json = (await res.json()) as { ok?: boolean; data?: TrustpilotReminderData };
    if (!res.ok || !json.ok || !json.data) return { showCta: false, trustpilotUrl: null, completedAt: null };
    return json.data;
  } catch {
    return { showCta: false, trustpilotUrl: null, completedAt: null };
  }
}

export async function fetchAccountGhn(): Promise<string | null> {
  const apiUrl = getBackendOrigin();
  if (!apiUrl) return null;
  const cookieHeader = await buildCookieHeader();
  try {
    const res = await fetch(`${apiUrl}/api/account/profile`, {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });
    const json = (await res.json()) as { ok?: boolean; data?: { profile?: { globalHealthNumber?: string | null } } };
    return json.ok ? (json.data?.profile?.globalHealthNumber ?? null) : null;
  } catch {
    return null;
  }
}

export type AccountThreadUnread = {
  appointmentId: string;
  unreadClinic: number;
  unreadDoctor: number;
};

/** Per-appointment unread counts (clinic + doctor threads) for the patient
 *  Messages tab. Only appointments with at least one unread message appear. */
export async function fetchAccountMessageUnread(): Promise<
  Record<string, AccountThreadUnread>
> {
  const apiUrl = getBackendOrigin();
  if (!apiUrl) return {};
  const cookieHeader = await buildCookieHeader();
  try {
    const res = await fetch(`${apiUrl}/api/account/message-threads`, {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });
    const json = (await res.json()) as {
      ok?: boolean;
      data?: { items?: AccountThreadUnread[] };
    };
    if (!json.ok || !json.data?.items) return {};
    const map: Record<string, AccountThreadUnread> = {};
    for (const item of json.data.items) {
      map[item.appointmentId] = item;
    }
    return map;
  } catch {
    return {};
  }
}

/**
 * Documents the clinic side added since the patient last opened Medical
 * Files — the nav badge next to that item. Same shape (and same silent-zero
 * failure mode) as the unread-message count above.
 */
export async function fetchPatientUnreadDocumentCount(): Promise<number> {
  const apiUrl = getBackendOrigin();
  if (!apiUrl) return 0;
  const cookieHeader = await buildCookieHeader();
  try {
    const res = await fetch(`${apiUrl}/api/account/medical-documents/unread-count`, {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });
    const json = (await res.json()) as { ok?: boolean; data?: { unreadCount?: number } };
    return json.ok && typeof json.data?.unreadCount === "number" ? json.data.unreadCount : 0;
  } catch {
    return 0;
  }
}
export async function fetchPatientUnreadMessageCount(): Promise<number> {
  const apiUrl = getBackendOrigin();
  if (!apiUrl) return 0;
  const cookieHeader = await buildCookieHeader();
  try {
    const res = await fetch(`${apiUrl}/api/account/messages/unread`, {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });
    const json = (await res.json()) as { ok?: boolean; data?: { unreadCount?: number } };
    return json.ok && typeof json.data?.unreadCount === "number" ? json.data.unreadCount : 0;
  } catch {
    return 0;
  }
}
