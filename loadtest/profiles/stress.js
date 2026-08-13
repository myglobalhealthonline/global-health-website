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

// Stress: ramp 200 -> 600 peak VUs, finding the actual ceiling and its
// failure mode (expected: pg.Pool exhaustion -> 5s connection-timeout
// errors, see backend/src/db/prisma.ts). abortOnFail stops the run early
// once the error rate makes continuing pointless, rather than hammering a
// visibly-broken system for the full duration.
export const options = {
  scenarios: buildScenarios(600, [
    { duration: "3m", target: 200 },
    { duration: "5m", target: 400 },
    { duration: "5m", target: 600 },
    { duration: "5m", target: 600 },
    { duration: "3m", target: 0 },
  ]),
  thresholds: {
    http_req_failed: [
      { threshold: "rate<0.25", abortOnFail: true, delayAbortEval: "30s" },
    ],
  },
};
