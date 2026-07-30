"use client";

type Result<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message: string };

/**
 * Admin block/unblock of one doctor slot. The doctor-side twin lives in
 * `doctor-availability-client.ts`; this one carries the doctorId because an
 * admin session has no doctor anchor of its own — the backend scopes the
 * write to that doctor's country.
 */
export async function adminToggleSlotStatus(
  doctorId: string,
  slotId: string,
  status: "OPEN" | "BLOCKED",
  reason?: string,
): Promise<Result<{ slot: { id: string; status: string; blockReason: string | null } }>> {
  const res = await fetch(
    `/api/admin/doctors/${encodeURIComponent(doctorId)}/time-slots/${encodeURIComponent(slotId)}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
    },
  );
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
export async function adminResizeSlot(
  doctorId: string,
  slotId: string,
  durationMinutes: number,
): Promise<Result<{ slot: { id: string; status: string } }>> {
  const res = await fetch(
    `/api/admin/doctors/${encodeURIComponent(doctorId)}/time-slots/${encodeURIComponent(slotId)}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ durationMinutes }),
    },
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    return { ok: false, message: json?.message ?? "Could not resize slot" };
  }
  return { ok: true, data: json.data };
}

/**
 * Add one-off slots at the given instants. Nothing to do with the doctor's
 * recurring weekly windows — the rows are flagged ad-hoc server-side so a later
 * window edit can't sweep them away. `startAtIsos` must be UTC instants: the
 * caller expands the date + time range the admin picked using the timezone the
 * calendar is displaying.
 *
 * Instants that clash with an existing slot are skipped rather than failing the
 * batch; the counts come back so the UI can say what actually happened.
 */
export async function adminCreateSlots(
  doctorId: string,
  startAtIsos: string[],
  durationMinutes: number,
): Promise<
  Result<{ created: number; skippedOverlap: number; skippedPast: number }>
> {
  const res = await fetch(
    `/api/admin/doctors/${encodeURIComponent(doctorId)}/time-slots`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ startAts: startAtIsos, durationMinutes }),
    },
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    return { ok: false, message: json?.message ?? "Could not add slots" };
  }
  return { ok: true, data: json.data };
}

/**
 * Remove one slot for its own date only. The backend deletes the row and
 * records an availability exception for the same span — without that, the
 * recurring weekly window would regenerate the slot on the next availability
 * read. The window itself is untouched, so the same weekday next week still
 * produces slots. BOOKED/HELD slots are refused (409).
 */
export async function adminRemoveSlot(
  doctorId: string,
  slotId: string,
  reason?: string,
): Promise<
  Result<{ removed: { id: string; startAt: string; endAt: string } }>
> {
  const res = await fetch(
    `/api/admin/doctors/${encodeURIComponent(doctorId)}/time-slots/${encodeURIComponent(slotId)}`,
    {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(reason ? { reason } : {}),
    },
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    return { ok: false, message: json?.message ?? "Could not remove slot" };
  }
  return { ok: true, data: json.data };
}
