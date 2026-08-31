import http from "k6/http";
import { sleep } from "k6";
import { BACKEND_BASE, authGetParams, checkStatus } from "../lib/helpers.js";

// Admin dashboard list pages — lowest-volume role (3% of mix) but the
// heaviest individual queries (cross-country joins, pagination over the
// full Order/Appointment/User tables).
export function adminPortal() {
  const reads = [
    "/api/admin/orders",
    "/api/admin/appointments",
    "/api/admin/users",
  ];
  const path = reads[Math.floor(Math.random() * reads.length)];
  const res = http.get(
    `${BACKEND_BASE}${path}?page=1&pageSize=20`,
    authGetParams("ADMIN", "admin:" + path)
  );
  checkStatus(res, [200, 401], `admin read ${path}`);
  sleep(2 + Math.random() * 3);
}
