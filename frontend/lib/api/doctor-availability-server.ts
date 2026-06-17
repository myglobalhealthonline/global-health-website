import "server-only";

import { cookies } from "next/headers";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import type { DoctorAvailabilityResponse } from "./doctor-availability-types";

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; status?: number };

async function cookieHeader(): Promise<string> {
  const store = await cookies();
  return store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

export async function fetchDoctorAvailability(
  days = 14,
): Promise<Result<DoctorAvailabilityResponse>> {
  return fetchDoctorAvailabilityRaw(`days=${days}`);
}

/**
 * Calendar variant — fetch availability for an explicit UTC window (the
 * visible month ± padding) rather than the next-N-days list.
 */
export async function fetchDoctorAvailabilityRange(
  fromIso: string,
  toIso: string,
): Promise<Result<DoctorAvailabilityResponse>> {
  const qs = `from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`;
  return fetchDoctorAvailabilityRaw(qs);
}

async function fetchDoctorAvailabilityRaw(
  qs: string,
): Promise<Result<DoctorAvailabilityResponse>> {
  const backend = getBackendOrigin();
  if (!backend) return { ok: false, message: "Backend not configured" };
  try {
    const res = await fetch(`${backend}/api/doctor/availability?${qs}`, {
      headers: { cookie: await cookieHeader() },
      cache: "no-store",
    });
    const json = (await res.json()) as {
      ok?: boolean;
      data?: DoctorAvailabilityResponse;
      message?: string;
    };
    if (!res.ok || !json.ok || !json.data) {
      return { ok: false, status: res.status, message: json.message ?? "Failed" };
    }
    return { ok: true, data: json.data };
  } catch {
    return { ok: false, message: "Backend unavailable" };
  }
}
