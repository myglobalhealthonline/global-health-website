import http from "k6/http";
import { sleep } from "k6";
import { BACKEND_BASE, authGetParams, checkStatus } from "../lib/helpers.js";

/**
 * CPU-heavy endpoints run alongside the main mix at fixed low iteration
 * rate (see profiles/*.js — a constant-arrival-rate executor, NOT scaled
 * with the main VU count). Purpose is to measure interference on the rest
 * of the mix, not to load-test PDF/export throughput itself:
 *   - confidentiality-agreement/pdf spawns Playwright/Chromium in-process
 *     on the API container (backend/src/modules/generated-documents/
 *     html-document-renderer.ts) — a handful of concurrent calls pins CPU.
 *   - reports/export and audit-log/export stream CSV over a paginated
 *     Prisma query, holding a pool connection for the query's duration.
 */
export function heavyLowRps() {
  const calls = [
    () =>
      http.get(
        `${BACKEND_BASE}/api/doctor/confidentiality-agreement/pdf`,
        authGetParams("DOCTOR", "heavy:confidentiality-pdf")
      ),
    () =>
      http.get(
        `${BACKEND_BASE}/api/admin/reports/export?dataset=appointments`,
        authGetParams("ADMIN", "heavy:reports-export")
      ),
  ];
  const call = calls[Math.floor(Math.random() * calls.length)];
  const res = call();
  checkStatus(res, [200, 401], "heavy endpoint");
  sleep(1);
}
