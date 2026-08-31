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

// Soak: 100 peak VUs, 2 hours. Watches for memory growth (Chromium/
// LibreOffice leaks in the PDF-render path), scheduler starvation, and
// slow connection-pool leaks that only show up over sustained duration —
// sample Railway CPU/memory and the DB pool-monitor CSV throughout, not
// just at the end.
export const options = {
  scenarios: buildScenarios(100, [
    { duration: "5m", target: 100 },
    { duration: "110m", target: 100 },
    { duration: "5m", target: 0 },
  ]),
  thresholds: THRESHOLDS,
};
