import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { BookingConfirmedTracker } from "./BookingConfirmedTracker";
import { trackBookingEvent } from "@/lib/analytics/booking";

const state = vi.hoisted(() => ({ analytics: true, cleanups: [] as (() => void)[] }));
vi.mock("react", () => ({
  useEffect: (fn: () => (() => void) | undefined) => { const cleanup = fn(); if (cleanup) state.cleanups.push(cleanup); },
  useRef: () => ({ current: null }),
}));
vi.mock("@/components/compliance/use-consent", () => ({ useConsent: () => ({ consent: state }) }));
vi.mock("@/lib/analytics/booking", () => ({
  bookingCategory: (kind: string) => kind === "GENERAL" ? "gp" : "specialist_care",
  trackBookingEvent: vi.fn(() => true),
}));
const props = { orderId: "private-order-id", bookings: [{ market: "ie", serviceKind: "GENERAL" }] };

beforeEach(() => {
  state.analytics = true;
  vi.mocked(trackBookingEvent).mockClear();
  const storage = new Map<string, string>();
  vi.stubGlobal("sessionStorage", { getItem: (key: string) => storage.get(key), setItem: (key: string, value: string) => storage.set(key, value) });
  const target = new EventTarget();
  vi.stubGlobal("window", Object.assign(target, { gtag: vi.fn() }));
});
afterEach(() => { state.cleanups.splice(0).forEach(fn => fn()); vi.unstubAllGlobals(); });

it("waits for consent and bootstrap, and deduplicates receipt reloads", () => {
  state.analytics = false;
  BookingConfirmedTracker(props);
  expect(trackBookingEvent).not.toHaveBeenCalled();
  state.analytics = true;
  window.gtag = undefined;
  BookingConfirmedTracker(props);
  expect(trackBookingEvent).not.toHaveBeenCalled();
  window.gtag = vi.fn();
  window.dispatchEvent(new Event("gh-ga-ready"));
  BookingConfirmedTracker(props);
  expect(trackBookingEvent).toHaveBeenCalledExactlyOnceWith("booking_confirmed", "ie", "gp");
});

it("does not count an unfulfilled order or consume dedup after a rejected send", () => {
  BookingConfirmedTracker({ ...props, bookings: [] });
  expect(trackBookingEvent).not.toHaveBeenCalled();
  vi.mocked(trackBookingEvent).mockReturnValueOnce(false);
  BookingConfirmedTracker(props);
  window.dispatchEvent(new Event("gh-ga-ready"));
  expect(trackBookingEvent).toHaveBeenCalledTimes(2);
});
