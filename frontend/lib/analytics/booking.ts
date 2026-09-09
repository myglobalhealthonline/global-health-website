import { trackAnalyticsEvent } from "./track";

export type BookingEvent = "book_appointment_click" | "select_time_slot" | "booking_confirmed";
export type BookingCategory = "gp" | "specialist_care" | "healthcare";

const MARKETS: Record<string, string> = {
  ie: "ireland", pt: "portugal", cz: "czechia", es: "spain", ro: "romania", br: "brazil",
};

// Never forward a slug, specialty, arbitrary parameter, or patient/order identifier.
export function bookingCategory(service: string | null | undefined): BookingCategory {
  if (!service) return "healthcare";
  if (service === "GENERAL" || /^(gp|general-consultation)(-|$)/i.test(service)) return "gp";
  return "specialist_care";
}

export function trackBookingEvent(event: BookingEvent, market: string, category: BookingCategory): boolean {
  if (typeof window === "undefined") return false;
  const normalized = MARKETS[market.toLowerCase()] ?? market.toLowerCase();
  if (!Object.values(MARKETS).includes(normalized)) return false;
  if (!["gp", "specialist_care", "healthcare"].includes(category)) return false;
  return trackAnalyticsEvent(event, {
    service_category: category,
    market: normalized,
    // Override automatic event context: no specialty URLs, titles or referrers.
    page_location: `${window.location.origin}/${normalized}/booking`,
    page_title: "Appointment booking",
    page_referrer: "",
  });
}

export function trackBookingClick(href: string, serviceKind?: string): void {
  const url = new URL(href, window.location.origin);
  const source = window.location.pathname;
  // Booking step navigation also uses BookCta; it isn't another funnel entry.
  if (/\/book(?:\/|$)/.test(source)) return;
  const service = url.searchParams.get("service");
  const market = url.pathname.split("/")[1] ?? "";
  const category = bookingCategory(serviceKind ?? (url.searchParams.get("gp") === "1" ? "GENERAL" : service));
  trackBookingEvent("book_appointment_click", market, category);
  if (url.searchParams.has("slot") || url.searchParams.has("at")) {
    trackBookingEvent("select_time_slot", market, category);
  }
}
