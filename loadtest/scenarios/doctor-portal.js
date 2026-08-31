import http from "k6/http";
import { sleep } from "k6";
import { BACKEND_BASE, authGetParams, checkStatus } from "../lib/helpers.js";

// Doctor dashboard reads — appointments list, patient list, own profile.
// Exercises the PHI decrypt path (lib/crypto/phi-crypto.ts) on patient
// records, which is CPU work distinct from the public read surface.
export function doctorPortal() {
  const reads = [
    "/api/doctor/me",
    "/api/doctor/appointments",
    "/api/doctor/patients",
    "/api/doctor/services",
    "/api/doctor/messages/unread",
  ];
  const path = reads[Math.floor(Math.random() * reads.length)];
  const res = http.get(
    `${BACKEND_BASE}${path}`,
    authGetParams("DOCTOR", "doctor:" + path)
  );
  checkStatus(res, [200, 401], `doctor read ${path}`);
  sleep(1.5 + Math.random() * 2.5);
}
