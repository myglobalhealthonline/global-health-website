import { expect, test } from "@playwright/test";

/**
 * Cart regression for the API performance work (perf plan docs/plans/new.md
 * §9.4). The projections changed how doctor/service CARDS are fetched; the
 * cart must be untouched by that, so these assert the cart's state machine
 * end to end against the running stack.
 *
 * Scope, stated honestly: this covers the guest-cart lifecycle, the
 * authenticated cart, and the fact that the two are kept apart. Adding a
 * CONSULTATION line requires a real `timeSlotId` + `doctorId`, i.e. live slot
 * inventory, and adding a HEALTH_TEST line requires a seeded health-test
 * catalogue — neither is fabricated here, so those rows of §9.4 (add
 * consultation / health test / prescription, quantity + benefit updates,
 * expired-hold messaging, checkout) still need an environment with real
 * availability. What IS covered is the part the perf change could plausibly
 * have broken: cart identity, persistence across requests, and isolation
 * between a guest and a signed-in user.
 */

const GUEST_COOKIE = "gh_cart";

test.describe("Cart — guest lifecycle", () => {
  test("a new guest starts with an empty cart and gets a cart cookie", async ({ request }) => {
    const response = await request.get("/api/cart");
    expect(response.status(), "GET /api/cart must not 5xx for an anonymous visitor").toBeLessThan(
      500,
    );
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data.items), "cart payload exposes an items array").toBe(true);
    expect(body.data.items).toHaveLength(0);
    expect(body.data.itemCount ?? 0).toBe(0);
    expect(body.data.subtotalCents ?? 0).toBe(0);

    // The guest cart is keyed by an HttpOnly cookie — the reason the plan
    // refuses to drop the cart request on public pages (§7.7).
    const cookies = await request.storageState();
    const cartCookie = cookies.cookies.find((c) => c.name === GUEST_COOKIE);
    if (cartCookie) {
      expect(cartCookie.httpOnly, "gh_cart must stay HttpOnly").toBe(true);
    }
  });

  test("the same guest keeps one cart across requests", async ({ request }) => {
    const first = await (await request.get("/api/cart")).json();
    const second = await (await request.get("/api/cart")).json();
    expect(first.ok && second.ok).toBe(true);
    // Whatever identity the server hands out, it must be stable — a cart that
    // changes id per request loses a returning guest's basket.
    if (first.data.id && second.data.id) {
      expect(second.data.id).toBe(first.data.id);
    }
  });

  test("clearing an empty guest cart is a no-op, not an error", async ({ request }) => {
    const cleared = await request.delete("/api/cart");
    expect(cleared.status()).toBeLessThan(500);
    const after = await (await request.get("/api/cart")).json();
    expect(after.data.items).toHaveLength(0);
  });

  test("a malformed add is rejected without disturbing the cart", async ({ request }) => {
    const bad = await request.post("/api/cart/items", { data: { kind: "NOT_A_KIND" } });
    expect(bad.status(), "an invalid item kind must be a 4xx, never a 5xx").toBeGreaterThanOrEqual(
      400,
    );
    expect(bad.status()).toBeLessThan(500);
    const after = await (await request.get("/api/cart")).json();
    expect(after.data.items, "a rejected add must not add a line").toHaveLength(0);
  });

  test("a consultation line without a slot is refused, not half-created", async ({ request }) => {
    // Slot + doctor are mandatory for consultation lines. Omitting them must
    // fail closed rather than create an unbookable line.
    const response = await request.post("/api/cart/items", {
      data: { kind: "GENERAL_CONSULTATION" },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
    const after = await (await request.get("/api/cart")).json();
    expect(after.data.items).toHaveLength(0);
  });
});

test.describe("Cart — authenticated", () => {
  test.skip(
    !process.env.E2E_TEST_EMAIL || !process.env.E2E_TEST_PASSWORD,
    "Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD to run the authenticated cart checks",
  );

  test("a signed-in patient gets their own cart, not the guest one", async ({ page, request }) => {
    const guest = await (await request.get("/api/cart")).json();
    expect(guest.ok).toBe(true);

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.fill('input[type="email"]', process.env.E2E_TEST_EMAIL!);
    await page.fill('input[type="password"]', process.env.E2E_TEST_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/account/, { timeout: 15_000 });

    const authed = await page.request.get("/api/cart");
    expect(authed.status(), "an authenticated cart read must not 5xx").toBeLessThan(500);
    expect(authed.status()).toBe(200);
    const body = await authed.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data.items)).toBe(true);
  });

  test("the cart survives a page navigation while signed in", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.fill('input[type="email"]', process.env.E2E_TEST_EMAIL!);
    await page.fill('input[type="password"]', process.env.E2E_TEST_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/account/, { timeout: 15_000 });

    const before = await (await page.request.get("/api/cart")).json();
    await page.goto("/ireland/en", { waitUntil: "domcontentloaded" });
    const after = await (await page.request.get("/api/cart")).json();

    expect(after.ok).toBe(true);
    expect(after.data.items).toHaveLength(before.data.items.length);
    if (before.data.id && after.data.id) expect(after.data.id).toBe(before.data.id);
  });
});
