import { CartItemKind } from "@prisma/client";

/**
 * One place that says which order lines are BOOKINGS — a line that claims a
 * slot and mints an Appointment — and which of those are doctor consultations.
 *
 * The distinction matters because the two answers diverge for exactly one
 * thing: a consultation gets a Google Meet link, a test booking gets the
 * centre's address. Everything else downstream (payment, order lifecycle,
 * message ladder, reminders) is shared, so widening a filter to BOOKING_KINDS
 * is usually right and widening it to CONSULTATION_KINDS never is.
 *
 * Kept separate from `generate-order-meet-link.service.ts` (which has its own
 * private copy of CONSULTATION_KINDS) so importing the discriminator does not
 * drag the Google Calendar client into every caller.
 */

/** Doctor consultations. These, and only these, provision a meeting link. */
export const CONSULTATION_KINDS: CartItemKind[] = [
  CartItemKind.GENERAL_CONSULTATION,
  CartItemKind.SPECIALIST_CONSULTATION,
];

/** Exam appointments at a physical test centre. No doctor, no meeting link. */
export const TEST_BOOKING_KINDS: CartItemKind[] = [CartItemKind.TEST_BOOKING];

/**
 * Every line that claims a slot and mints an Appointment.
 *
 * NOT the same as "every kind that can be booked online": HEALTH_TEST and
 * PRESCRIPTION_SERVICE are products with no slot, and LAB_EXAM is minted by the
 * lab-orders module rather than booked.
 */
export const BOOKING_KINDS: CartItemKind[] = [
  ...CONSULTATION_KINDS,
  ...TEST_BOOKING_KINDS,
];

export function orderHasTestBookingItem(items: { kind: CartItemKind }[]): boolean {
  return items.some((item) => TEST_BOOKING_KINDS.includes(item.kind));
}

export function orderHasBookingItem(items: { kind: CartItemKind }[]): boolean {
  return items.some((item) => BOOKING_KINDS.includes(item.kind));
}

export function isTestBookingKind(kind: CartItemKind): boolean {
  return TEST_BOOKING_KINDS.includes(kind);
}

export function isConsultationKind(kind: CartItemKind): boolean {
  return CONSULTATION_KINDS.includes(kind);
}
