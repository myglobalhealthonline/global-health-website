import http from "k6/http";
import { sleep } from "k6";
import { FRONTEND_BASE, BACKEND_BASE, backendParams, checkStatus } from "../lib/helpers.js";
const targets = JSON.parse(open("../config/targets.json"));

// Anonymous browsing mix: mostly SSR page loads (through the frontend, i.e.
// the real double-hop path), plus a slice of direct public API reads that
// mimic client-side fetches. Deliberately excludes /sitemap.xml and
// /llms.txt (force-dynamic, expensive fan-out) — those are tested
// separately at fixed low RPS, never inside the main mix.
export function publicBrowse() {
  const pages = targets.pagesToBrowse;
  const page = pages[Math.floor(Math.random() * pages.length)];
  const pageRes = http.get(
    `${FRONTEND_BASE}${page}`,
    backendParams("page:" + page)
  );
  checkStatus(pageRes, 200, `page ${page}`);
  sleep(1 + Math.random() * 2);

  // A couple of public API reads a real page load would trigger client-side.
  const apiCalls = [
    () => http.get(`${BACKEND_BASE}/api/countries`, backendParams("api:countries")),
    () =>
      http.get(
        `${BACKEND_BASE}/api/countries/${targets.primaryCountry}/doctors`,
        backendParams("api:doctors")
      ),
    () =>
      http.get(
        `${BACKEND_BASE}/api/countries/${targets.primaryCountry}/services`,
        backendParams("api:services")
      ),
    () => http.get(`${BACKEND_BASE}/api/specialties`, backendParams("api:specialties")),
    () => http.get(`${BACKEND_BASE}/api/blog`, backendParams("api:blog")),
  ];
  const call = apiCalls[Math.floor(Math.random() * apiCalls.length)];
  const apiRes = call();
  checkStatus(apiRes, 200, "public api read");
  sleep(0.5 + Math.random());
}
