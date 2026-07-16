/**
 * True end instant of a scheduled consultation.
 *
 * Calendars must draw a booking across the minutes it actually occupies. The
 * length lives in one of two places, in priority order:
 *
 *   1. The claimed `DoctorTimeSlot` — under the base-grid + consume model
 *      (see `consumeConsecutiveSlots`) a booking collapses the base slots it
 *      consumed into ONE row spanning `[start, start + duration)`, so the
 *      slot's `endAt` IS the consultation's real end.
 *   2. `scheduledAt + service.durationMinutes` — appointments carrying no slot
 *      (legacy rows, admin-scheduled by hand).
 *
 * Returns null when neither is known, so the caller falls back to its own
 * default rather than being handed a fabricated span. Callers previously sent
 * no end at all and the week grid defaulted every consultation to 30 minutes —
 * painting a 15-min booking over two slots and hiding the open slot beneath it.
 */
export function resolveConsultationEndAt(appt: {
  scheduledAt: Date | null;
  timeSlot?: { endAt: Date } | null;
  service?: { durationMinutes: number | null } | null;
}): string | null {
  if (appt.timeSlot) return appt.timeSlot.endAt.toISOString();
  const duration = appt.service?.durationMinutes;
  if (appt.scheduledAt && duration != null && duration > 0) {
    return new Date(appt.scheduledAt.getTime() + duration * 60_000).toISOString();
  }
  return null;
}
