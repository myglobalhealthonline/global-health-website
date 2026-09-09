import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { bookingCategory, trackBookingClick, trackBookingEvent } from "./booking";
import { trackAnalyticsEvent } from "./track";
import { flushGtagQueue, resetGtagQueue } from "./gtag";

const consent = vi.hoisted(() => ({ analytics: true }));
vi.mock("@/components/compliance/cookie-consent", () => ({ readConsent: () => consent }));
vi.mock("./config", () => ({ ANALYTICS_ENABLED: true, GA_MEASUREMENT_ID: "G-TEST123" }));

beforeEach(() => {
  consent.analytics = true;
  resetGtagQueue();
  vi.stubGlobal("window", {
    location: { origin: "https://example.test", pathname: "/ireland/en/services/psychiatry" },
    gtag: vi.fn(), dispatchEvent: vi.fn(),
  });
});
afterEach(() => vi.unstubAllGlobals());

it("sends broad categories and redacted context for all three events", () => {
  for (const event of ["book_appointment_click", "select_time_slot", "booking_confirmed"] as const) {
    trackBookingEvent(event, "ie", bookingCategory("psychiatry-consultation"));
    expect(window.gtag).toHaveBeenLastCalledWith("event", event, {
      service_category: "specialist_care", market: "ireland",
      page_location: "https://example.test/ireland/booking",
      page_title: "Appointment booking", page_referrer: "",
    });
  }
  expect(bookingCategory("GENERAL")).toBe("gp");
  expect(bookingCategory(undefined)).toBe("healthcare");
  expect(bookingCategory("oncology")).toBe("specialist_care");
});

it("does not leak booking query state or count internal step navigation as entry", () => {
  trackBookingClick("/ireland/en/book?service=psychiatry&doctor=private-id&slot=private-slot");
  expect(JSON.stringify(vi.mocked(window.gtag!).mock.calls)).not.toMatch(/psychiatry|private/);
  vi.mocked(window.gtag!).mockClear();
  window.location.pathname = "/ireland/en/book";
  trackBookingClick("/ireland/en/book?service=psychiatry&slot=private-slot");
  expect(window.gtag).not.toHaveBeenCalled();
});

it("rejects unsafe dimensions and declined consent", () => {
  expect(trackBookingEvent("booking_confirmed", "patient@example.test", "gp")).toBe(false);
  expect(trackBookingEvent("booking_confirmed", "ie", "psychiatry" as never)).toBe(false);
  consent.analytics = false;
  expect(trackBookingEvent("booking_confirmed", "ie", "gp")).toBe(false);
  expect(window.gtag).not.toHaveBeenCalled();
});

it("buffers consented events until bootstrap, and drops them on withdrawal", () => {
  const gtag = window.gtag;
  window.gtag = undefined;
  expect(trackAnalyticsEvent("select_time_slot", { market: "ireland" })).toBe(true);
  window.gtag = gtag;
  flushGtagQueue();
  expect(gtag).toHaveBeenCalledTimes(1);
  window.gtag = undefined;
  trackAnalyticsEvent("select_time_slot");
  resetGtagQueue();
  window.gtag = gtag;
  flushGtagQueue();
  expect(gtag).toHaveBeenCalledTimes(1);
});
