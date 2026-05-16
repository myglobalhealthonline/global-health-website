import "server-only";

import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

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
};

type ApiResult<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message: string; status?: number };

function buildCookieHeader() {
  return cookies()
    .then((store) =>
      store
        .getAll()
        .map((entry) => `${entry.name}=${entry.value}`)
        .join("; "),
    )
    .catch(() => "");
}

export async function fetchAccountAppointments(): Promise<ApiResult<{ items: AccountAppointment[] }>> {
  if (!API_URL) return { ok: false, message: "Public API URL is not configured" };
  const cookieHeader = await buildCookieHeader();
  try {
    const response = await fetch(`${API_URL}/api/account/appointments`, {
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

