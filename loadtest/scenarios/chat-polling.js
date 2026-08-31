import http from "k6/http";
import { sleep } from "k6";
import { BACKEND_BASE, authGetParams, checkStatus } from "../lib/helpers.js";

// Per-VU cache of a real appointment id to poll, so this scenario exercises
// the actual per-conversation GET a doctor's open chat window makes (both
// sides hit it every ~10s per consultation-chat.route.ts's own doc comment)
// instead of only the inbox roll-up. Discovered once per VU from the same
// message-threads list a doctor's UI loads on session start.
let cachedAppointmentId = null;

function discoverAppointmentId() {
  const res = http.get(
    `${BACKEND_BASE}/api/doctor/message-threads`,
    authGetParams("DOCTOR", "chat:threads")
  );
  checkStatus(res, [200, 401], "chat threads discovery");
  try {
    const items = JSON.parse(res.body).data.items || [];
    if (items.length > 0 && items[0].appointmentId) {
      return items[0].appointmentId;
    }
  } catch (e) {
    // fall through
  }
  return null;
}

// Consultation chat polling — real client behavior is short-interval GET
// polling of one open conversation during an active consultation. Each VU
// here represents one open doctor chat window.
export function chatPolling() {
  if (!cachedAppointmentId) {
    cachedAppointmentId = discoverAppointmentId();
  }

  if (cachedAppointmentId) {
    const res = http.get(
      `${BACKEND_BASE}/api/doctor/appointments/${cachedAppointmentId}/chat`,
      authGetParams("DOCTOR", "chat:conversation")
    );
    checkStatus(res, [200, 401, 404], "chat conversation poll");
  } else {
    // No thread available for this identity/environment (empty cookie pool,
    // or the doctor has no messaged appointments) — fall back to the inbox
    // roll-up so the VU still exercises a real endpoint instead of no-oping.
    const res = http.get(
      `${BACKEND_BASE}/api/doctor/message-threads`,
      authGetParams("DOCTOR", "chat:threads")
    );
    checkStatus(res, [200, 401], "chat threads poll");
  }
  sleep(10);
}
