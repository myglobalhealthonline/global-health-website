import type { BookabilityActionProps } from "@/components/booking/BookNowButton";
import type { BookabilitySummary } from "@/lib/content/get-country-collections";

export type BookabilityMessages = {
  notAcceptingOnlineBookings: string;
  returningOn: string;
  nextAvailable: string;
};

function formatDate(value: string, locale: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(value));
}

/** Build all labels on the server so the first render never flashes active. */
export function getBookabilityActionProps(
  bookability: BookabilitySummary,
  locale: string,
  messages: BookabilityMessages,
  timeZone: string,
): BookabilityActionProps {
  const nextDate = bookability.nextAvailableAt
    ? formatDate(bookability.nextAvailableAt, locale, timeZone)
    : null;
  return {
    bookability,
    unavailableLabel: messages.notAcceptingOnlineBookings,
    returningLabel: nextDate
      ? messages.returningOn.replace("{date}", nextDate)
      : messages.notAcceptingOnlineBookings,
    nextAvailableLabel: nextDate
      ? messages.nextAvailable.replace("{date}", nextDate)
      : undefined,
  };
}
