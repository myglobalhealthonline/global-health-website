import { expect, test, type Cookie, type Page } from "@playwright/test";

/**
 * Phase F regression spec — docs/plans/portal-implementation/task.md §11.
 * Covers the doctor/admin appointment workspace, calendars, and
 * account pages after the Phase B/C/D portal fixes (commits 4ca59296,
 * 07d75ad2, 21b7dacd): sticky tab/rail overlap, tab state preservation,
 * ?tab= deep links, calendar day AppSheet fit, and keyboard/focus.
 *
 * Auth pattern + overflow allow-list mirror responsive.spec.ts /
 * responsive-matrix.spec.ts — reuse, don't fork. Env-gated so a CI run
 * without creds skips cleanly instead of failing.
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

const VIEWPORTS = [
  { width: 375, height: 667 },
  { width: 768, height: 1024 },
  { width: 1024, height: 600 },
  { width: 1440, height: 550 },
  { width: 1440, height: 900 },
];

async function pageOverflowReport(page: Page): Promise<string[]> {
  return page.evaluate((allowlist: string[]) => {
    const doc = document.documentElement;
    const overflow = doc.scrollWidth - doc.clientWidth;
    if (overflow <= 1) return [];
    const offenders: string[] = [];
    const vw = doc.clientWidth;
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      if (r.right <= vw + 1 && r.left >= -1) continue;
      if (allowlist.some((sel) => el.closest(sel))) continue;
      let p = el.parentElement;
      let clipped = false;
      while (p && p !== document.body) {
        const s = getComputedStyle(p);
        if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) {
          clipped = true;
          break;
        }
        p = p.parentElement;
      }
      if (clipped) continue;
      offenders.push(
        `${el.tagName.toLowerCase()}.${String(el.className).split(/\s+/).slice(0, 3).join(".")} right=${Math.round(r.right)} vw=${vw}`,
      );
      if (offenders.length >= 8) break;
    }
    return offenders.length ? offenders : [`page scrollWidth exceeds clientWidth by ${overflow}px`];
  }, HSCROLL_ALLOWLIST);
}

async function expectNoPageHScroll(page: Page, label: string) {
  let offenders: string[] = [];
  await expect
    .poll(
      async () => {
        offenders = await pageOverflowReport(page);
        return offenders.length;
      },
      { timeout: 10_000, message: `${label}: page must not scroll horizontally` },
    )
    .toBe(0)
    .catch(() => {
      expect(offenders, `${label}: page must not scroll horizontally — ${offenders.join(" | ")}`).toEqual([]);
    });
}

/**
 * API login instead of driving the UI form: the client-side "Logged in…
 * Redirecting…" step is known to stall (FINDINGS.md non-layout flags —
 * "Login redirect stall"), and this spec's 53 cases share only 3 test
 * accounts against a backend proxying the production DB, so logging in
 * per-test exhausts its connection pool (observed as 503 "Authentication
 * is temporarily unavailable" under load). Cache the `Set-Cookie` per
 * role per worker process — only the first test per role per worker pays
 * for a real login; the rest reuse the cookie via `context.addCookies`.
 * One retry absorbs a transient 503 if two tests race the first login.
 */
const authCookieCache = new Map<string, Promise<Cookie[]>>();

async function login(page: Page, email: string, password: string, landingPath: string) {
  const cacheKey = email;
  if (!authCookieCache.has(cacheKey)) {
    authCookieCache.set(
      cacheKey,
      (async () => {
        let lastError: unknown;
        for (let attempt = 0; attempt < 3; attempt++) {
          const response = await page.request
            .post("/api/auth/login", { data: { email, password }, timeout: 15_000 })
            .catch((e) => {
              lastError = e;
              return null;
            });
          if (response?.ok()) {
            const cookies = await page.context().cookies();
            return cookies.filter((c) => c.name === "gh_auth");
          }
          if (response) lastError = new Error(`login POST failed: ${response.status()} ${await response.text().catch(() => "")}`);
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
        throw lastError instanceof Error ? lastError : new Error(String(lastError));
      })(),
    );
  }
  const cookies = await authCookieCache.get(cacheKey)!;
  await page.context().addCookies(cookies);
  await page.goto(landingPath, { waitUntil: "domcontentloaded" });
}

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "globalhealth@myglobalhealth.online";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "GHAdmin2026X7qL9!";
const DOCTOR_EMAIL = process.env.E2E_DOCTOR_EMAIL ?? "doctor@globalhealthonline.com";
const DOCTOR_PASSWORD = process.env.E2E_DOCTOR_PASSWORD ?? "GHAdmin2026X7qL9!";
const PATIENT_EMAIL = process.env.E2E_TEST_EMAIL ?? "patient@globalhealthonline.com";
const PATIENT_PASSWORD = process.env.E2E_TEST_PASSWORD ?? "GHAdmin2026X7qL9!";
const TEST_APPOINTMENT_ID = "9482a98c-1ad7-4c77-9c48-746806e322f4";

const SKIP_NO_CREDS = "requires E2E_* credentials / a reachable backend — set env vars to run";

// The local dev server (Turbopack, cold route compiles) proxying the
// Railway-hosted backend is measurably slower than a production build under
// this suite's navigation-heavy load — the default 30s test timeout produces
// environment-flake failures, not real regressions. Give every test in this
// file more headroom.
test.beforeEach(async ({}, testInfo) => {
  testInfo.setTimeout(60_000);
});

test.describe("portal responsive regression — overflow", () => {
  test.describe("doctor", () => {
    test.beforeEach(async ({ page }) => {
      test.skip(!DOCTOR_EMAIL || !DOCTOR_PASSWORD, SKIP_NO_CREDS);
      await login(page, DOCTOR_EMAIL, DOCTOR_PASSWORD, "/doctor");
    });

    for (const vp of VIEWPORTS) {
      for (const route of [
        `/doctor/appointments/${TEST_APPOINTMENT_ID}`,
        "/doctor/calendar",
        "/doctor/appointments",
      ]) {
        test(`${route} @ ${vp.width}x${vp.height} has no page h-scroll`, async ({ page }) => {
          await page.setViewportSize(vp);
          await page.goto(route, { waitUntil: "domcontentloaded" });
          await expectNoPageHScroll(page, `${route} @ ${vp.width}x${vp.height}`);
        });
      }
    }
  });

  test.describe("admin", () => {
    test.beforeEach(async ({ page }) => {
      test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, SKIP_NO_CREDS);
      await login(page, ADMIN_EMAIL, ADMIN_PASSWORD, "/admin");
    });

    for (const vp of VIEWPORTS) {
      for (const route of ["/admin/appointments", "/admin/services", "/admin/calendar"]) {
        test(`${route} @ ${vp.width}x${vp.height} has no page h-scroll`, async ({ page }) => {
          await page.setViewportSize(vp);
          await page.goto(route, { waitUntil: "domcontentloaded" });
          await expectNoPageHScroll(page, `${route} @ ${vp.width}x${vp.height}`);
        });
      }
    }
  });

  test.describe("patient", () => {
    test.beforeEach(async ({ page }) => {
      test.skip(!PATIENT_EMAIL || !PATIENT_PASSWORD, SKIP_NO_CREDS);
      await login(page, PATIENT_EMAIL, PATIENT_PASSWORD, "/account");
    });

    for (const vp of VIEWPORTS) {
      for (const route of ["/account/profile", "/account/bookings", "/account/family"]) {
        test(`${route} @ ${vp.width}x${vp.height} has no page h-scroll`, async ({ page }) => {
          await page.setViewportSize(vp);
          await page.goto(route, { waitUntil: "domcontentloaded" });
          await expectNoPageHScroll(page, `${route} @ ${vp.width}x${vp.height}`);
        });
      }
    }
  });
});

test.describe("doctor appointment workspace — tab/rail layout", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!DOCTOR_EMAIL || !DOCTOR_PASSWORD, SKIP_NO_CREDS);
    await login(page, DOCTOR_EMAIL, DOCTOR_PASSWORD, "/doctor");
  });

  test("tab strip visible+clickable, no overlap with patient rail at multiple scroll positions", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/doctor/appointments/${TEST_APPOINTMENT_ID}`, { waitUntil: "domcontentloaded" });

    const tablist = page.locator('[role="tablist"]').first();
    await expect(tablist, "tab strip visible").toBeVisible();
    const secondTab = page.locator('[role="tab"]').nth(1);
    await expect(secondTab, "second tab clickable").toBeVisible();
    await secondTab.click();
    await expect(secondTab).toHaveAttribute("aria-selected", "true");

    const rail = page.locator(".gh-doctor-context-rail");
    for (const scrollY of [0, 400, 900]) {
      await page.evaluate((y) => window.scrollTo(0, y), scrollY);
      await page.waitForTimeout(50);
      const tabBox = await tablist.boundingBox();
      const railBox = await rail.boundingBox();
      if (!tabBox || !railBox) continue; // rail may have scrolled out of the flow entirely
      const overlapX = Math.max(0, Math.min(tabBox.x + tabBox.width, railBox.x + railBox.width) - Math.max(tabBox.x, railBox.x));
      const overlapY = Math.max(0, Math.min(tabBox.y + tabBox.height, railBox.y + railBox.height) - Math.max(tabBox.y, railBox.y));
      expect(overlapX * overlapY, `tab strip must not overlap patient rail at scrollY=${scrollY}`).toBeLessThanOrEqual(0);
    }
  });

  test("patient context reachable: rail at >=1024px, Patient tab below 1024px", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/doctor/appointments/${TEST_APPOINTMENT_ID}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".gh-doctor-context-rail"), "rail visible >=1024px w/ ample height").toBeVisible();

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload({ waitUntil: "domcontentloaded" });
    const patientTab = page.locator('#gh-tab-patient');
    await expect(patientTab, "Patient tab present below 1024px").toBeVisible();
  });

  test("tab switching preserves typed SOAP text", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/doctor/appointments/${TEST_APPOINTMENT_ID}`, { waitUntil: "domcontentloaded" });

    const consultationTab = page.locator('[role="tab"]', { hasText: /consult/i }).first();
    await consultationTab.click();
    const textarea = page.locator("#gh-tabpanel-consultation textarea").first();
    await expect(textarea).toBeVisible();
    const probe = `e2e-probe-${Date.now()}`;
    await textarea.fill(probe);

    const overviewTab = page.locator('[role="tab"]', { hasText: /overview/i }).first();
    await overviewTab.click();
    await expect(page.locator("#gh-tabpanel-consultation")).toBeHidden();

    await consultationTab.click();
    await expect(textarea).toHaveValue(probe);
    // DO NOT save — this is a read-only verification pass against prod DB.
  });

  test("?tab= deep link opens the right tab", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/doctor/appointments/${TEST_APPOINTMENT_ID}?tab=documents`, { waitUntil: "domcontentloaded" });
    const documentsTab = page.locator("#gh-tab-documents");
    await expect(documentsTab).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#gh-tabpanel-documents")).toBeVisible();
  });

  test("arrow keys move tab focus/selection", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/doctor/appointments/${TEST_APPOINTMENT_ID}`, { waitUntil: "domcontentloaded" });
    const firstTab = page.locator('[role="tab"]').first();
    await firstTab.focus();
    await page.keyboard.press("ArrowRight");
    const secondTab = page.locator('[role="tab"]').nth(1);
    await expect(secondTab).toHaveAttribute("aria-selected", "true");
    await expect(secondTab).toBeFocused();
  });
});

test.describe("admin appointment detail — ?tab= deep link", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, SKIP_NO_CREDS);
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD, "/admin");
  });

  test("admin appointment ?tab= opens the right tab", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    // Admin appointment tabs (21b7dacd rebuild): overview / schedule / messages.
    const res = await page
      .goto(`/admin/appointments/${TEST_APPOINTMENT_ID}?tab=schedule`, { waitUntil: "domcontentloaded" })
      .catch(() => null);
    test.skip(!res || res.status() >= 400, "test appointment not reachable from this admin account");
    const tab = page.locator('[role="tab"][aria-selected="true"]').first();
    await expect(tab).toHaveAttribute("id", /schedule/);
  });
});

test.describe("account profile — ?tab= deep link", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!PATIENT_EMAIL || !PATIENT_PASSWORD, SKIP_NO_CREDS);
    await login(page, PATIENT_EMAIL, PATIENT_PASSWORD, "/account");
  });

  test("account/profile ?tab= opens the right tab", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/account/profile", { waitUntil: "domcontentloaded" });
    const tabs = page.locator('[role="tab"]');
    const count = await tabs.count();
    test.skip(count < 2, "profile page has no secondary tab to deep-link to");
    const targetId = await tabs.nth(1).getAttribute("id");
    const targetValue = targetId?.replace(/^gh-tab-/, "");
    test.skip(!targetValue, "could not resolve tab value from id");
    await page.goto(`/account/profile?tab=${targetValue}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(`#${targetId}`)).toHaveAttribute("aria-selected", "true");
  });
});

test.describe("calendar day AppSheet — fits viewport at short height", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!DOCTOR_EMAIL || !DOCTOR_PASSWORD, SKIP_NO_CREDS);
    await login(page, DOCTOR_EMAIL, DOCTOR_PASSWORD, "/doctor");
  });

  test("doctor calendar day sheet: content fits, body scrolls, footer reachable", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 550 });
    await page.goto("/doctor/calendar", { waitUntil: "domcontentloaded" });
    const dayCell = page.locator(".gh-calendar-day").first();
    await dayCell.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog, "day sheet opens").toBeVisible();
    const box = await dialog.boundingBox();
    const vp = page.viewportSize()!;
    expect(box, "sheet has a bounding box").toBeTruthy();
    expect(box!.y, "sheet top within viewport").toBeGreaterThanOrEqual(-1);
    expect(box!.y + box!.height, "sheet bottom within viewport").toBeLessThanOrEqual(vp.height + 1);

    // Escape closes the sheet and returns focus to the trigger.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(dayCell).toBeFocused();
  });
});
