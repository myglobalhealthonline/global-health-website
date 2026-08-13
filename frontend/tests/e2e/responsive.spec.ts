import { expect, test, type Page } from "@playwright/test";

/**
 * Phase 8 responsive regression harness (RESPONSIVE_IMPLEMENTATION_PLAN §8).
 *
 * Three assertion families:
 *  1. Page-level horizontal overflow — no route may scroll the PAGE
 *     horizontally at any tested width. Inner scrollers are allowed only if
 *     they appear in HSCROLL_ALLOWLIST, which mirrors
 *     docs/design/responsive/shared/intentional-horizontal-scroll.md.
 *     Keep the two in sync.
 *  2. Overlay visibility — AppMenu / RecordDetailsDrawer content must land
 *     fully inside the viewport and be hit-testable (elementFromPoint).
 *  3. Drawer deep-link + back button on /admin/users (D-02).
 *
 * Portal tests are env-gated like patient-portal.spec.ts:
 *   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD
 *   E2E_DOCTOR_EMAIL / E2E_DOCTOR_PASSWORD
 *   E2E_TEST_EMAIL / E2E_TEST_PASSWORD   (patient)
 */

/** Mirrors INTENTIONAL_HORIZONTAL_SCROLL.md — the only containers allowed to
 *  own a horizontal scrollbar. */
const HSCROLL_ALLOWLIST = [
  ".gh2-scroll-fade", // booking slot strips (service-time-picker, slot-picker-step)
  ".gh-hscroll-fade", // CSV preview + generic edge-fade scrollers
  ".gh-portal-tabs", // portal tab strip (mask affordance)
  "[role=\"tablist\"]", // admin-main tablists share the gh-portal-tabs rule
  ".gh-cpt-table-wrap", // ColumnPriorityTable/audit-log table wrappers
  ".gh-doctor-table-wrap",
  ".gh-admin-ops-table-wrap",
  ".gh-marquee-track", // marquees (overflow-hidden parent, animated)
];

const WIDTHS = [320, 390, 768, 1024, 1280];

/** True when the page itself has a horizontal scrollbar. Returns the list of
 *  offending elements (wider than the viewport and not inside an allow-listed
 *  scroller) for the failure message. */
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
      // Skip elements clipped inside an allow-listed scroller.
      if (allowlist.some((sel) => el.closest(sel))) continue;
      // Skip elements inside ANY ancestor that actually clips them.
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
    return offenders.length ? offenders : [`page scrollWidth exceeds clientWidth by ${overflow}px (offender not isolated)`];
  }, HSCROLL_ALLOWLIST);
}

async function expectNoPageHScroll(page: Page, label: string) {
  // Poll: dev-mode first compile + font/image swaps can transiently widen the
  // page right after navigation; only a PERSISTENT overflow is a bug.
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

/** Overlay must be fully inside the viewport and hit-testable at its center. */
async function expectOverlayOperable(page: Page, selector: string, label: string) {
  const overlay = page.locator(selector).first();
  await expect(overlay, `${label}: overlay visible`).toBeVisible();
  const box = await overlay.boundingBox();
  expect(box, `${label}: overlay has a bounding box`).toBeTruthy();
  const vp = page.viewportSize()!;
  expect(box!.x, `${label}: overlay left edge in viewport`).toBeGreaterThanOrEqual(-1);
  expect(box!.y, `${label}: overlay top edge in viewport`).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width, `${label}: overlay right edge in viewport`).toBeLessThanOrEqual(vp.width + 1);
  expect(box!.y + box!.height, `${label}: overlay bottom edge in viewport`).toBeLessThanOrEqual(vp.height + 1);
  const hit = await page.evaluate(
    ({ sel, x, y }) => {
      const target = document.querySelector(sel);
      const atPoint = document.elementFromPoint(x, y);
      return !!target && !!atPoint && (target === atPoint || target.contains(atPoint));
    },
    { sel: selector, x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 },
  );
  expect(hit, `${label}: overlay center is hit-testable (not covered)`).toBeTruthy();
}

async function login(page: Page, email: string, password: string, landing: RegExp) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(landing, { timeout: 15_000 });
}

/* ------------------------------------------------------------------ */
/* 1. Public routes — page-level overflow                             */
/* ------------------------------------------------------------------ */

const PUBLIC_ROUTES = ["/", "/ireland/en", "/ireland/en/services", "/login"];

test.describe("responsive: public page overflow", () => {
  for (const route of PUBLIC_ROUTES) {
    for (const width of WIDTHS) {
      test(`${route} @ ${width}px has no page h-scroll`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 });
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await expectNoPageHScroll(page, `${route} @ ${width}px`);
      });
    }
  }
});

/* ------------------------------------------------------------------ */
/* 2. Admin portal — overflow, AppMenu overlay, D-02 drawer deep link */
/* ------------------------------------------------------------------ */

test.describe("responsive: admin portal", () => {
  test.skip(
    !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
    "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin responsive tests",
  );

  test.beforeEach(async ({ page }) => {
    await login(page, process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASSWORD!, /\/(admin|account)/);
  });

  for (const width of [320, 390, 768, 1024, 1280]) {
    test(`/admin/users @ ${width}px has no page h-scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/admin/users", { waitUntil: "domcontentloaded" });
      await expectNoPageHScroll(page, `/admin/users @ ${width}px`);
    });
  }

  test("user menu (AppMenu) opens inside viewport and is hit-testable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin/users", { waitUntil: "domcontentloaded" });
    // PortalUserMenu trigger = the avatar button in the shell header.
    const trigger = page.locator('[aria-haspopup="menu"]').last();
    await trigger.click();
    await expectOverlayOperable(page, '[role="menu"]', "admin user menu @390px");
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="menu"]')).toHaveCount(0);
  });

  test("D-02 drawer: row click sets ?user=, deep link restores, Escape clears", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 844 });
    await page.goto("/admin/users", { waitUntil: "domcontentloaded" });
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.click();
    await expect(page.locator('[role="dialog"]').first()).toBeVisible();
    await expect(page).toHaveURL(/[?&]user=/);
    const deepLink = page.url();

    // Deep link in a fresh navigation restores the drawer.
    await page.goto(deepLink, { waitUntil: "domcontentloaded" });
    await expectOverlayOperable(page, '[role="dialog"]', "users drawer via deep link");

    // Escape closes and removes the param.
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
    await expect(page).not.toHaveURL(/[?&]user=/);
  });

  test("D-02 drawer: browser back after opening does not trap the user", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 844 });
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await page.goto("/admin/users", { waitUntil: "domcontentloaded" });
    await page.locator("table tbody tr").first().click();
    await expect(page.locator('[role="dialog"]').first()).toBeVisible();
    // Drawer open uses router.replace (no history entry) — back must leave
    // /admin/users entirely, not reopen or strand the drawer.
    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/admin(\/)?(\?.*)?$/);
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  });

  test("/admin/audit-log wide table scrolls inside its wrapper only", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 844 });
    await page.goto("/admin/audit-log", { waitUntil: "domcontentloaded" });
    await expectNoPageHScroll(page, "/admin/audit-log @ 1024px");
  });
});

/* ------------------------------------------------------------------ */
/* 3. Doctor portal                                                   */
/* ------------------------------------------------------------------ */

test.describe("responsive: doctor portal", () => {
  test.skip(
    !process.env.E2E_DOCTOR_EMAIL || !process.env.E2E_DOCTOR_PASSWORD,
    "Set E2E_DOCTOR_EMAIL and E2E_DOCTOR_PASSWORD to run doctor responsive tests",
  );

  test.beforeEach(async ({ page }) => {
    await login(page, process.env.E2E_DOCTOR_EMAIL!, process.env.E2E_DOCTOR_PASSWORD!, /\/doctor/);
  });

  for (const width of [320, 390, 768, 1280]) {
    test(`/doctor/appointments @ ${width}px has no page h-scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/doctor/appointments", { waitUntil: "domcontentloaded" });
      await expectNoPageHScroll(page, `/doctor/appointments @ ${width}px`);
    });
  }

  test("doctor user menu opens inside viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/doctor", { waitUntil: "domcontentloaded" });
    const trigger = page.locator('[aria-haspopup="menu"]').last();
    await trigger.click();
    await expectOverlayOperable(page, '[role="menu"]', "doctor user menu @390px");
  });
});

/* ------------------------------------------------------------------ */
/* 4. Patient portal                                                  */
/* ------------------------------------------------------------------ */

test.describe("responsive: patient portal", () => {
  test.skip(
    !process.env.E2E_TEST_EMAIL || !process.env.E2E_TEST_PASSWORD,
    "Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD to run patient responsive tests",
  );

  test.beforeEach(async ({ page }) => {
    await login(page, process.env.E2E_TEST_EMAIL!, process.env.E2E_TEST_PASSWORD!, /\/account/);
  });

  for (const width of [320, 390, 768, 1280]) {
    test(`/account/bookings @ ${width}px has no page h-scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/account/bookings", { waitUntil: "domcontentloaded" });
      await expectNoPageHScroll(page, `/account/bookings @ ${width}px`);
    });
  }

  test("patient user menu opens inside viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/account", { waitUntil: "domcontentloaded" });
    const trigger = page.locator('[aria-haspopup="menu"]').last();
    await trigger.click();
    await expectOverlayOperable(page, '[role="menu"]', "patient user menu @390px");
  });
});
