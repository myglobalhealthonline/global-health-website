// Shared scenario/threshold wiring for every profile in ../profiles/*.js.
// Keeps the 70/20/7/3 traffic-mix ratio (public/patient/doctor/admin) from
// the plan consistent across smoke/baseline/target/stress/spike/soak so
// results are comparable across the execution ladder.

export const THRESHOLDS = {
  "http_req_duration{name:page:/ireland/en}": ["p(95)<1500"],
  http_req_failed: ["rate<0.01"],
  checks: ["rate>0.95"],
};

// stages: array of {duration, target} ramping-vus stages, sized against a
// peakVUs figure representing total concurrent virtual users for the run.
export function buildScenarios(peakVUs, stages, opts) {
  opts = opts || {};
  const startVUs = opts.startVUs || 0;
  // Proportional split of the peak concurrency across the five scenario
  // groups. Minimum of 1 VU per group so small smoke runs still exercise
  // every code path.
  const alloc = (fraction) => Math.max(1, Math.round(peakVUs * fraction));

  const rampingStagesFor = (fraction) =>
    stages.map((s) => ({
      duration: s.duration,
      target: Math.max(1, Math.round(s.target * fraction)),
    }));

  return {
    public_browse: {
      executor: "ramping-vus",
      exec: "publicBrowse",
      startVUs,
      stages: rampingStagesFor(0.7),
      gracefulRampDown: "10s",
    },
    patient_reads: {
      executor: "ramping-vus",
      exec: "patientPortal",
      startVUs,
      stages: rampingStagesFor(0.15),
      gracefulRampDown: "10s",
    },
    booking_journey: {
      executor: "ramping-vus",
      exec: "bookingJourney",
      startVUs,
      stages: rampingStagesFor(0.05),
      gracefulRampDown: "10s",
    },
    doctor_flows: {
      executor: "ramping-vus",
      exec: "doctorPortal",
      startVUs,
      stages: rampingStagesFor(0.05),
      gracefulRampDown: "10s",
    },
    chat_polling: {
      executor: "ramping-vus",
      exec: "chatPolling",
      startVUs,
      stages: rampingStagesFor(0.02),
      gracefulRampDown: "10s",
    },
    admin_flows: {
      executor: "ramping-vus",
      exec: "adminPortal",
      startVUs,
      stages: rampingStagesFor(0.03),
      gracefulRampDown: "10s",
    },
    // Fixed, low, NOT scaled with peakVUs — see scenarios/heavy-low-rps.js.
    heavy_endpoints: {
      executor: "constant-arrival-rate",
      exec: "heavyLowRps",
      rate: opts.heavyRatePerMinute || 4,
      timeUnit: "1m",
      duration: opts.heavyDuration || totalDuration(stages),
      preAllocatedVUs: 3,
      maxVUs: 6,
    },
  };
}

function totalDuration(stages) {
  // Sum stage durations like "5m" / "30s" into a k6 duration string.
  let totalSeconds = 0;
  for (const s of stages) {
    const m = /^(\d+)(s|m|h)$/.exec(s.duration);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    const mult = { s: 1, m: 60, h: 3600 }[m[2]];
    totalSeconds += n * mult;
  }
  return `${totalSeconds}s`;
}

export { publicBrowse } from "../scenarios/public-browse.js";
export { patientPortal } from "../scenarios/patient-portal.js";
export { bookingJourney } from "../scenarios/booking-journey.js";
export { doctorPortal } from "../scenarios/doctor-portal.js";
export { adminPortal } from "../scenarios/admin-portal.js";
export { chatPolling } from "../scenarios/chat-polling.js";
export { heavyLowRps } from "../scenarios/heavy-low-rps.js";
