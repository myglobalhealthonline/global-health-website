import "server-only";

import { cookies } from "next/headers";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export type AccountPayment = {
  id: string;
  appointmentId: string;
  consultationType: string;
  countryCode: string;
  status: "REQUIRES_ACTION" | "PROCESSING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELED" | "UNPAID";
  amountCents: number;
  currencyCode: string;
  eventType: string;
  bookedAt: string;
  paidAt: string;
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

export async function fetchAccountPayments(): Promise<ApiResult<{ items: AccountPayment[] }>> {
  // Server-side origin helper — picks API_BASE_URL when set, falls back
  // to NEXT_PUBLIC_API_URL. Avoids "unavailable" on private-backend deploys.
  const apiUrl = getBackendOrigin();
  if (!apiUrl) return { ok: false, message: "Public API URL is not configured" };
  const cookieHeader = await buildCookieHeader();
  try {
    const response = await fetch(`${apiUrl}/api/account/payments`, {
      method: "GET",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });
    const json = (await response.json()) as {
      ok?: boolean;
      data?: { items?: AccountPayment[] };
      message?: string;
    };
    if (!response.ok || !json.ok || !json.data?.items) {
      return {
        ok: false,
        status: response.status,
        message: json.message ?? "Unable to load payment history",
      };
    }
    return { ok: true, data: { items: json.data.items }, message: json.message };
  } catch {
    return { ok: false, message: "Backend is unavailable" };
  }
}
