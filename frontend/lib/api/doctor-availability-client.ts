"use client";

import type {
  AvailabilityWindow,
  DoctorAvailabilityResponse,
} from "./doctor-availability-types";
import type { BulkSlotInput, BulkSlotResult } from "./slot-bulk-types";

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

/** Every field optional — send only what changed. `null` on an effective date
 *  clears the boundary ("always" / "forever"); omitting it leaves it alone. */
export type UpdateWindowInput = {
  weekday?: number;
  startMinute?: number;
  endMinute?: number;
  slotDurationMinutes?: number;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  isActive?: boolean;
};

export async function updateAvailabilityWindow(
  availabilityId: string,
  input: UpdateWindowInput,
): Promise<Result<{ availability: AvailabilityWindow }>> {
  const res = await fetch(`/api/doctor/availability/${availabilityId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    return { ok: false, message: json?.message ?? "Could not update window" };
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

/** Client-side fetch of the availability window for a calendar month
 *  (same-origin proxy → backend). Used when the doctor navigates months. */
export async function fetchAvailabilityRangeClient(
  fromIso: string,
  toIso: string,
): Promise<Result<DoctorAvailabilityResponse>> {
  const qs = `from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`;
  const res = await fetch(`/api/doctor/availability?${qs}`, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok || !json.data) {
    return { ok: false, message: json?.message ?? "Could not load availability" };
  }
  return { ok: true, data: json.data };
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

/**
 * Resize a slot on the base grid, keeping its start. Growing swallows the
 * following free slots; shrinking hands the tail back as base-grid slots with
 * the same status. Refused (409) if a booked or held slot is in the way.
 */
export async function resizeSlot(
  slotId: string,
  durationMinutes: number,
): Promise<Result<{ id: string; status: string }>> {
  const res = await fetch(`/api/doctor/time-slots/${slotId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ durationMinutes }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    return { ok: false, message: json?.message ?? "Could not resize slot" };
  }
  return { ok: true, data: json.data };
}

/**
 * Remove a slot for its own date only. The backend deletes the row and records
 * an availability exception, so the recurring weekly window can't regenerate
 * it; the window itself is untouched.
 */
export async function removeSlot(
  slotId: string,
  reason?: string,
): Promise<Result<{ removed: { id: string; startAt: string; endAt: string } }>> {
  const res = await fetch(`/api/doctor/time-slots/${slotId}`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(reason ? { reason } : {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    return { ok: false, message: json?.message ?? "Could not remove slot" };
  }
  return { ok: true, data: json.data };
}

/**
 * Add one-off slots at the given UTC instants — no recurring window involved,
 * and the rows survive later edits to those windows. Instants that clash with
 * an existing slot are skipped and counted rather than failing the batch.
 */
export async function createSlots(
  startAtIsos: string[],
  durationMinutes: number,
): Promise<Result<{ created: number; skippedOverlap: number; skippedPast: number }>> {
  const res = await fetch("/api/doctor/time-slots", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ startAts: startAtIsos, durationMinutes }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    return { ok: false, message: json?.message ?? "Could not add slots" };
  }
  return { ok: true, data: json.data };
}

/**
 * Block / unblock / remove many slots in a single request — either a date ×
 * time sweep (`spans`, already expanded to UTC by the caller, which owns the
 * display timezone) or an explicit selection (`slotIds`). BOOKED/HELD slots
 * come back in `skippedOccupied` rather than failing the whole request.
 */
export async function bulkSlotAction(
  input: BulkSlotInput,
): Promise<Result<BulkSlotResult>> {
  const res = await fetch("/api/doctor/time-slots/bulk", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    return { ok: false, message: json?.message ?? "Could not update slots" };
  }
  return { ok: true, data: json.data };
}

/**
 * Block (or re-open) every OPEN/BLOCKED slot in a UTC range — the doctor
 * calendar's "block whole day / time-off" control. `fromUtc`/`toUtc` are ISO
 * instants; the backend materialises missing recurring slots before blocking.
 */
export async function bulkBlockSlots(input: {
  fromUtc: string;
  toUtc: string;
  action: "BLOCK" | "UNBLOCK";
  reason?: string;
}): Promise<Result<{ updated: number; action: "BLOCK" | "UNBLOCK" }>> {
  const res = await fetch("/api/doctor/time-slots/bulk-block", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    return { ok: false, message: json?.message ?? "Could not update time-off" };
  }
  return { ok: true, data: json.data };
}
