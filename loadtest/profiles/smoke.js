import { buildScenarios, THRESHOLDS } from "../lib/profile-builder.js";

export {
  publicBrowse,
  patientPortal,
  bookingJourney,
  doctorPortal,
  adminPortal,
  chatPolling,
  heavyLowRps,
  authLoad,
} from "../lib/profile-builder.js";

// Smoke: 5 peak VUs, 2 minutes. Proves the harness end-to-end (auth cookies
// valid, no real emails/WhatsApp/Stripe fired, no hard 4xx from wrong
// request shapes) before any real load is applied. Run this first, always.
export const options = {
  scenarios: buildScenarios(
    5,
    [
      { duration: "30s", target: 5 },
      { duration: "60s", target: 5 },
      { duration: "30s", target: 0 },
    ],
    { heavyRatePerMinute: 2 }
  ),
  thresholds: THRESHOLDS,
};
