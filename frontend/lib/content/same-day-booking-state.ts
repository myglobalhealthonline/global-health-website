import type { BookabilitySummary } from "./get-country-collections";

const POLICY_UNAVAILABLE_REASONS = new Set<BookabilitySummary["reasonCode"]>([
  "COUNTRY_PAUSED",
  "SERVICE_PAUSED",
  "DOCTOR_PAUSED",
  "NO_APPROVED_DOCTOR",
]);

export function getSameDayEmptyMessage(
  bookability: BookabilitySummary | null | undefined,
  messages: { noSlots: string; unavailable: string },
): string {
  return bookability?.state !== "BOOKABLE" &&
    POLICY_UNAVAILABLE_REASONS.has(bookability?.reasonCode ?? null)
    ? messages.unavailable
    : messages.noSlots;
}
