import { test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Phase 8 FULL matrix runner — generates the data for
 * docs/design/responsive/shared/final-verification.md. Not part of the normal
 * suite: run with RUN_MATRIX=1 (skipped otherwise). One test per role loops
 * routes × viewports and appends JSON rows to MATRIX_OUT; baseline
 * screenshots (390px + 1280px per route) land in
 * docs/design/responsive/shared/baseline/.
 *
 * Checks per route × viewport:
 *  - hscroll: page-level horizontal overflow (allow-list mirrors
 *    INTENTIONAL_HORIZONTAL_SCROLL.md, same list as responsive.spec.ts)
 *  - cardMode: at the 761–1023px band, ColumnPriorityTable lists must show
 *    cards (gh-cpt-mobile-list visible) or a fitting table — never a page
 *    h-scroll (that is what hscroll catches); we record which mode rendered.
 * Overlay/focus checks live in responsive.spec.ts, not here.
 */

const HSCROLL_ALLOWLIST = [
  ".gh2-scroll-fade",
  ".gh-hscroll-fade",
  ".gh-portal-tabs",
  '[role="tablist"]',
  ".gh-cpt-table-wrap",
  ".gh-doctor-table-wrap",
  ".gh-admin-ops-table-wrap",
  ".gh-marquee-track",
];

const WIDTHS = [320, 390, 768, 1024, 1280, 1440, 1920];
const HEIGHTS = [500, 620, 768, 844];
const EXTRA = [
  { width: 667, height: 375, tag: "landscape" },
  { width: 640, height: 500, tag: "zoom200" }, // 1280px @ 200% zoom equivalent
];

const OUT = process.env.MATRIX_OUT ?? "matrix-results.jsonl";
const SHOT_DIR = path.resolve(__dirname, "../../../docs/design/responsive/shared/baseline");

type RouteDef = { route: string; name: string };

const PUBLIC_ROUTES: RouteDef[] = [
  { route: "/", name: "gate" },
  { route: "/ireland/en", name: "home" },
  { route: "/ireland/en/doctors", name: "doctors" },
  { route: "/ireland/en/pricing", name: "pricing" },
  { route: "/ireland/en/book", name: "book" },
  { route: "/ireland/en/cart", name: "cart" },
  { route: "/ireland/en/checkout", name: "checkout" },
];
const ADMIN_ROUTES: RouteDef[] = [
  { route: "/admin/orders", name: "admin-orders" },
  { route: "/admin/users", name: "admin-users" },
  { route: "/admin/patients", name: "admin-patients" },
  { route: "/admin/audit-log", name: "admin-audit-log" },
];
const DOCTOR_ROUTES: RouteDef[] = [
  { route: "/doctor/appointments", name: "doctor-appointments" },
  { route: "/doctor/invoices", name: "doctor-invoices" },
  { route: "/doctor/calendar", name: "doctor-calendar" },
];
const PATIENT_ROUTES: RouteDef[] = [
  { route: "/account/bookings", name: "account-bookings" },
  { route: "/account/payments", name: "account-payments" },
];
const CORPORATE_ROUTES: RouteDef[] = [{ route: "/corporate/employees", name: "corporate-employees" }];

function record(row: object) {
  fs.appendFileSync(OUT, JSON.stringify(row) + "\n");
}

async function checkViewport(page: Page, def: RouteDef, width: number, height: number, tag?: string) {
  await page.setViewportSize({ width, height });
  const res = await page.goto(def.route, { waitUntil: "domcontentloaded" }).catch(() => null);
  const status = res?.status() ?? 0;
  const data = await page.evaluate((allowlist: string[]) => {
    const doc = document.documentElement;
    const overflow = doc.scrollWidth - doc.clientWidth;
    let offender = "";
    if (overflow > 1) {
      const vw = doc.clientWidth;
      for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || (r.right <= vw + 1 && r.left >= -1)) continue;
        if (allowlist.some((sel) => el.closest(sel))) continue;
        let p = el.parentElement;
        let clipped = false;
        while (p && p !== document.body) {
          if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX)) {
            clipped = true;
            break;
          }
          p = p.parentElement;
        }
        if (clipped) continue;
        offender = `${el.tagName.toLowerCase()}.${String(el.className).split(/\s+/).slice(0, 2).join(".")}`;
        break;
      }
    }
    const isVisible = (el: Element | null) => !!el && getComputedStyle(el as HTMLElement).display !== "none";
    const cptTable = document.querySelector(".gh-cpt-table-wrap");
    const cptCards = document.querySelector(".gh-cpt-mobile-list");
    const cardMode = cptCards || cptTable ? (isVisible(cptCards) ? "cards" : isVisible(cptTable) ? "table" : "none-visible") : "n/a";
    return { overflowPx: overflow > 1 && offender ? overflow : 0, offender, cardMode, url: location.pathname };
  }, HSCROLL_ALLOWLIST);
  record({ name: def.name, route: def.route, width, height, tag: tag ?? "", status, ...data });
}

async function sweep(page: Page, routes: RouteDef[]) {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  for (const def of routes) {
    for (const width of WIDTHS) for (const height of HEIGHTS) await checkViewport(page, def, width, height);
    for (const e of EXTRA) await checkViewport(page, def, e.width, e.height, e.tag);
    // Baseline screenshots at 390 and 1280.
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(def.route, { waitUntil: "domcontentloaded" }).catch(() => null);
      await page.screenshot({ path: path.join(SHOT_DIR, `${def.name}-${width}.png`), fullPage: false });
    }
  }
}

async function login(page: Page, email: string, password: string, landing: RegExp) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(landing, { timeout: 15_000 });
}

test.describe("responsive matrix (RUN_MATRIX=1)", () => {
  test.skip(!process.env.RUN_MATRIX, "Set RUN_MATRIX=1 to run the full matrix");
  test.describe.configure({ mode: "serial" });
  test.setTimeout(30 * 60_000);

  test("public routes", async ({ page }) => {
    await sweep(page, PUBLIC_ROUTES);
  });

  test("admin routes", async ({ page }) => {
    test.skip(!process.env.E2E_ADMIN_EMAIL, "no admin creds");
    await login(page, process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASSWORD!, /\/(admin|account)/);
    await sweep(page, ADMIN_ROUTES);
  });

  test("doctor routes", async ({ page }) => {
    test.skip(!process.env.E2E_DOCTOR_EMAIL, "no doctor creds");
    await login(page, process.env.E2E_DOCTOR_EMAIL!, process.env.E2E_DOCTOR_PASSWORD!, /\/doctor/);
    await sweep(page, DOCTOR_ROUTES);
  });

  test("patient routes", async ({ page }) => {
    test.skip(!process.env.E2E_TEST_EMAIL, "no patient creds");
    await login(page, process.env.E2E_TEST_EMAIL!, process.env.E2E_TEST_PASSWORD!, /\/account/);
    await sweep(page, PATIENT_ROUTES);
  });

  test("corporate routes", async ({ page }) => {
    test.skip(!process.env.E2E_CORPORATE_EMAIL, "no corporate creds");
    await login(page, process.env.E2E_CORPORATE_EMAIL!, process.env.E2E_CORPORATE_PASSWORD!, /\/corporate/);
    await sweep(page, CORPORATE_ROUTES);
  });
});
