import { readConsent } from "@/components/compliance/cookie-consent";
import { ANALYTICS_ENABLED, GA_MEASUREMENT_ID } from "./config";

/**
 * The only sanctioned way to send a custom event to Google Analytics. Nothing
 * in the app should touch `window.gtag` directly.
 *
 * The event name is a closed union rather than a string: on a healthcare
 * platform an ad-hoc `gtag("event", whatever)` is how free-text symptom or
 * appointment data ends up in an analytics property, and a union makes that a
 * compile error instead of a code-review question.
 */
export type AnalyticsEventName =
  | "add_to_cart"
  | "begin_checkout"
  | "select_service"
  | "begin_booking";

export type SafeAnalyticsValue = string | number | boolean;
export type SafeAnalyticsParameters = Readonly<Record<string, SafeAnalyticsValue>>;

/**
 * Tripwire, not the primary control. `SafeAnalyticsValue` already blocks
 * objects and arrays at compile time; this catches the two runtime shapes a
 * human is most likely to pass by accident — an email address, and a long
 * free-text string (a reason-for-visit, a search query, a note).
 */
function isSafe(value: SafeAnalyticsValue): boolean {
  if (typeof value !== "string") return true;
  return value.length <= 100 && !value.includes("@");
}

export function trackAnalyticsEvent(
  eventName: AnalyticsEventName,
  parameters: SafeAnalyticsParameters = {},
): void {
  if (typeof window === "undefined") return;
  if (!ANALYTICS_ENABLED || GA_MEASUREMENT_ID === "") return;
  // Read the cookie at call time rather than going through useConsent(), so
  // this is callable from event handlers and context providers and is always
  // current — including in the render right after a withdrawal.
  if (readConsent()?.analytics !== true) return;

  const gtag = window.gtag;
  // Deliberately DROPPED, not queued, when gtag.js hasn't loaded: an
  // interaction event that arrives twenty seconds late is noise. A page_view
  // is different, and that one is buffered (see lib/analytics/gtag.ts).
  if (!gtag) return;

  const safe: Record<string, SafeAnalyticsValue> = {};
  for (const [key, value] of Object.entries(parameters)) {
    if (isSafe(value)) safe[key] = value;
  }
  gtag("event", eventName, safe);
}
