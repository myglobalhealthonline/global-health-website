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
