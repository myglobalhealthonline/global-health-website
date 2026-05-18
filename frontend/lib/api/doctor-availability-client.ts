"use client";

import type { AvailabilityWindow } from "./doctor-availability-types";

type Result<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message: string };

export type CreateWindowInput = {
  weekday: number;
  startMinute: number;
  endMinute: number;
  slotDurationMinutes?: number;
  /** ISO datetime — window only kicks in from this date onwards. Omitted = always. */
  effectiveFrom?: string;
  /** ISO datetime — window stops applying after this date. Omitted = forever. */
  effectiveUntil?: string;
};

export async function createAvailabilityWindow(
  input: CreateWindowInput,
): Promise<Result<{ availability: AvailabilityWindow }>> {
  const res = await fetch("/api/doctor/availability", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    return { ok: false, message: json?.message ?? "Could not add window" };
  }
  return { ok: true, data: json.data };
}

export async function deleteAvailabilityWindow(
  availabilityId: string,
): Promise<Result<null>> {
  const res = await fetch(`/api/doctor/availability/${availabilityId}`, {
    method: "DELETE",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    return { ok: false, message: json?.message ?? "Could not delete window" };
  }
  return { ok: true, data: null };
}

export async function toggleSlotStatus(
  slotId: string,
  status: "OPEN" | "BLOCKED",
): Promise<Result<{ id: string; status: string }>> {
  const res = await fetch(`/api/doctor/time-slots/${slotId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    return { ok: false, message: json?.message ?? "Could not update slot" };
  }
  return { ok: true, data: json.data };
}
