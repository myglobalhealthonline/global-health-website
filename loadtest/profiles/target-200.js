import { buildScenarios, THRESHOLDS } from "../lib/profile-builder.js";

export {
  publicBrowse,
  patientPortal,
  bookingJourney,
  doctorPortal,
  adminPortal,
  chatPolling,
  heavyLowRps,
} from "../lib/profile-builder.js";

// Target: ramp to 200 peak VUs, hold 30 minutes. This is the certification
// run — the number the plan promises to certify against.
export const options = {
  scenarios: buildScenarios(200, [
    { duration: "3m", target: 200 },
    { duration: "30m", target: 200 },
    { duration: "3m", target: 0 },
  ]),
  thresholds: THRESHOLDS,
};
