import { buildScenarios } from "../lib/profile-builder.js";

export {
  publicBrowse,
  patientPortal,
  bookingJourney,
  doctorPortal,
  adminPortal,
  chatPolling,
  heavyLowRps,
} from "../lib/profile-builder.js";

// Spike: 0 -> 300 peak VUs in 30s, hold 5 minutes. Simulates a launch/
// marketing-announcement traffic surge rather than gradual ramp-up.
export const options = {
  scenarios: buildScenarios(300, [
    { duration: "30s", target: 300 },
    { duration: "5m", target: 300 },
    { duration: "1m", target: 0 },
  ]),
  thresholds: {
    http_req_failed: [
      { threshold: "rate<0.3", abortOnFail: true, delayAbortEval: "30s" },
    ],
  },
};
