import { expect, it, vi, afterEach } from "vitest";
import { trackMetaEvent, flushMetaQueue, resetMetaQueue } from "./meta";
const consent = vi.hoisted(() => ({ marketing: true }));
vi.mock("@/components/compliance/cookie-consent", () => ({ readConsent: () => consent }));
afterEach(() => { resetMetaQueue(); vi.unstubAllGlobals(); consent.marketing = true; });

it("drops specialty/contact parameters and never flushes after withdrawal", () => {
  vi.stubGlobal("window", { fbq: vi.fn() });
  trackMetaEvent("Purchase", { value: 25, currency: "EUR", email: "patient@example.test", specialty: "psychiatry" }, "order");
  expect(window.fbq).toHaveBeenCalledExactlyOnceWith("track", "Purchase", { value: 25, currency: "EUR" }, { eventID: "order" });
  const fbq = vi.fn();
  window.fbq = undefined;
  trackMetaEvent("Purchase", { value: 25, currency: "EUR" }, "order");
  consent.marketing = false;
  window.fbq = fbq;
  flushMetaQueue();
  expect(fbq).not.toHaveBeenCalled();
});
