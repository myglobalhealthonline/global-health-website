import http from "k6/http";
import { sleep } from "k6";
import { BACKEND_BASE, authGetParams, checkStatus } from "../lib/helpers.js";

// Read-heavy authenticated patient traffic: dashboard, appointments,
// prescriptions, profile, notifications. Requires config/cookies.json to
// contain PATIENT-role identities (see scripts/mint-load-test-cookies.mjs).
export function patientPortal() {
  const reads = [
    "/api/account/appointments",
    "/api/account/profile",
    "/api/account/orders",
    "/api/me/notifications",
    "/api/me/subscription",
    "/api/me/memberships",
    "/api/cart",
  ];
  const path = reads[Math.floor(Math.random() * reads.length)];
  const res = http.get(
    `${BACKEND_BASE}${path}`,
    authGetParams("PATIENT", "patient:" + path)
  );
  checkStatus(res, [200, 401], `patient read ${path}`);
  sleep(1 + Math.random() * 2);
}
