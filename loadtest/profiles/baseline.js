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

// Baseline: 50 peak VUs, 15 minutes. Establishes healthy-system latency
// numbers to compare the 200-VU certification run against.
export const options = {
  scenarios: buildScenarios(50, [
    { duration: "2m", target: 50 },
    { duration: "11m", target: 50 },
    { duration: "2m", target: 0 },
  ]),
  thresholds: THRESHOLDS,
};
