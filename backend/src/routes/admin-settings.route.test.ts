import assert from "node:assert/strict";
import { after, before, beforeEach, it, mock } from "node:test";
import Fastify, { type FastifyInstance, type FastifyPluginAsync } from "fastify";

let role = "ADMIN";
let reads = 0;
let writes: Array<{ key: string; value: unknown }> = [];
let stops = 0;
let retries = 0;
let retryAllowed = false;
let listQuery: unknown;
let app: FastifyInstance;
const automation = { enabled: false, activatedAt: null, delayHours: 24, maxFollowups: 1, followupIntervalDays: 7 };
const config = { doctify: { reviewUrl: "https://www.doctify.com/review/global-health" }, trustpilot: { reviewUrl: null } };

before(async () => {
  mock.module("../utils/admin-auth.js", { namedExports: { verifyGlobalAdminAccess: async () => ["ADMIN", "SUPER_ADMIN"].includes(role) ? { ok: true } : { ok: false, status: role ? 403 : 401, message: "Denied" } } });
  mock.module("../modules/settings/settings.service.js", { namedExports: {
    getPublicReviewConfig: async () => { reads++; return config; },
    getAdminCountryReviewDestinations: async () => [{ countryCode: "IE", countryName: "Ireland", sendReviewRequests: false, googleReviewUrl: null }],
  } });
  mock.module("../modules/review-invites/review-campaign.service.js", { namedExports: {
    getReviewAutomationSettings: async () => automation,
    stopReviewCampaign: async () => { stops++; },
    retryReviewDelivery: async () => { retries++; return retryAllowed; },
  } });
  mock.module("../lib/email/templates.js", { namedExports: { buildReviewInviteEmail: () => ({ subject: "Preview", html: "<p>Preview</p>", text: "Preview" }) } });
  mock.module("../db/prisma.js", { namedExports: { prisma: {
    country: { findMany: async () => [{ code: "IE" }] },
    setting: { upsert: ({ create }: { create: { key: string; value: unknown } }) => { writes.push(create); return Promise.resolve(); }, deleteMany: () => Promise.resolve() },
    reviewInvite: { findMany: async (query: unknown) => { reads++; listQuery = query; return []; }, count: async () => 0, findFirst: async () => ({ id: "invite" }) },
    $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations),
  } } });
  app = Fastify();
  await app.register((await import("./admin-settings.route.js")).default as unknown as FastifyPluginAsync);
  await app.ready();
});
after(async () => { await app?.close(); });
beforeEach(() => { role = "ADMIN"; reads = 0; writes = []; stops = 0; retries = 0; retryAllowed = false; });

it("denies non-global admins before settings, activity, preview or mutations", async () => {
  for (role of ["", "LOCAL_ADMIN", "PATIENT", "DOCTOR"]) {
    for (const [method, path] of [["GET", ""], ["PATCH", ""], ["GET", "/activity"], ["GET", "/preview"], ["POST", "/activity/invite/stop"], ["POST", "/activity/delivery/retry"]] as const) {
      assert.equal((await app.inject({ method, url: `/api/admin/settings/reviews${path}`, ...(method === "PATCH" ? { payload: {} } : {}) })).statusCode, role ? 403 : 401);
    }
  }
  assert.deepEqual([reads, writes.length, stops, retries], [0, 0, 0, 0]);
});
it("validates pagination and applies country and status filters", async () => {
  for (const query of ["page=0", "page=1.5", "country=US", "status=bogus"]) assert.equal((await app.inject({ url: `/api/admin/settings/reviews/activity?${query}` })).statusCode, 400);
  assert.equal((await app.inject({ url: "/api/admin/settings/reviews/activity?page=2&country=IE&status=reported" })).statusCode, 200);
  assert.deepEqual((listQuery as { where: unknown }).where, { campaignVersion: 1, countryCode: "IE", patientReviewedAt: { not: null } });
  assert.equal((listQuery as { skip: number }).skip, 25);
});
it("saves automation independently and owns activation time on the server", async () => {
  const { activatedAt: _ignored, ...input } = automation;
  const response = await app.inject({ method: "PATCH", url: "/api/admin/settings/reviews", payload: { automation: { ...input, enabled: true } } });
  assert.equal(response.statusCode, 200);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].key, "review.automation");
  assert.ok((writes[0].value as { activatedAt: string }).activatedAt);
});
it("does not enable a country with no usable provider and restricts retries", async () => {
  const response = await app.inject({ method: "PATCH", url: "/api/admin/settings/reviews", payload: { doctify: { reviewUrl: null }, destinations: [{ countryCode: "IE", sendReviewRequests: true, googleReviewUrl: null }] } });
  assert.equal(response.statusCode, 400);
  assert.equal(writes.length, 0);
  assert.equal((await app.inject({ method: "POST", url: "/api/admin/settings/reviews/activity/delivery/retry" })).statusCode, 409);
  retryAllowed = true;
  assert.equal((await app.inject({ method: "POST", url: "/api/admin/settings/reviews/activity/delivery/retry" })).statusCode, 200);
});
