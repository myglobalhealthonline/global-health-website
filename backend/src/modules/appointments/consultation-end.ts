/**
 * True end instant of a scheduled consultation.
 *
 * Calendars must draw a booking across the minutes it actually occupies. The
 * length is known from two independent sources, and we take whichever ends
 * LATER — each is a floor, not a ceiling:
 *
 *   1. The claimed `DoctorTimeSlot`. Under the base-grid + consume model (see
 *      `consumeConsecutiveSlots`) a booking collapses the base slots it
 *      consumed into ONE row spanning `[start, start + duration)`, rounded up
 *      to a whole number of base steps — so the slot's `endAt` is the real end
 *      and is never SHORTER than the service duration.
 *   2. `scheduledAt + service.durationMinutes`.
 *
 * Preferring the slot unconditionally under-draws two real cases:
 *   - Rows booked before the collapse logic shipped, whose slot is still
 *     base-width (e.g. 30 min) while the service actually runs 45 or 60. The
 *     grid painted them 30 min long and freed half the consult as bookable.
 *   - A slot later re-materialised to the base grid underneath a live booking.
 * Preferring the service duration unconditionally is equally wrong: it drops
 * the base-step rounding (a 20-min service on a 15-min grid really occupies
 * 30). Max of the two is right in every case.
 *
 * Returns null when neither is known, so the caller falls back to its own
 * default rather than being handed a fabricated span.
 */
export function resolveConsultationEndAt(appt: {
  scheduledAt: Date | null;
  timeSlot?: { endAt: Date } | null;
  service?: { durationMinutes: number | null } | null;
}): string | null {
  const duration = appt.service?.durationMinutes;
  const serviceEndMs =
    appt.scheduledAt && duration != null && duration > 0
      ? appt.scheduledAt.getTime() + duration * 60_000
      : null;
  const slotEndMs = appt.timeSlot?.endAt.getTime() ?? null;
  if (slotEndMs == null && serviceEndMs == null) return null;
  return new Date(Math.max(slotEndMs ?? 0, serviceEndMs ?? 0)).toISOString();
}
