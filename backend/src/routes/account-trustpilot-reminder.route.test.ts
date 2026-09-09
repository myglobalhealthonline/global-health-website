import assert from "node:assert/strict";
import { before, after, afterEach, it, mock } from "node:test";
import Fastify, { type FastifyInstance, type FastifyPluginAsync } from "fastify";
let app: FastifyInstance;
let lookup: any;
const stops: unknown[][] = [];
before(async () => {
 mock.module("../db/prisma.js", { namedExports: { prisma: { reviewInvite: { findFirst: async (query: any) => { lookup = query.where; return query.where.appointment.userId === "owner" ? { id: "campaign", localeCode: "pt-br", countryCode: "BR", stoppedAt: null } : null; } } } } });
 mock.module("../utils/require-auth.js", { namedExports: { requireAuth: async (request: any, reply: any) => { const user = request.headers["x-test-user"]; if (!user) return reply.status(401).send({ ok: false }); request.authUser = { sub: user }; } } });
 mock.module("../modules/settings/settings.service.js", { namedExports: { getPatientReviewDestinations: async () => [{ provider: "DOCTIFY", url: "https://www.doctify.com/review" }] } });
 mock.module("../modules/review-invites/review-campaign.service.js", { namedExports: { stopReviewCampaign: async (...args: unknown[]) => { stops.push(args); } } });
 app = Fastify();
 await app.register((await import("./account-trustpilot-reminder.route.js")).default as unknown as FastifyPluginAsync);
});
after(async () => { await app.close(); });
afterEach(() => { stops.length = 0; });
it("requires authentication", async () => { assert.equal((await app.inject({ url: "/api/account/trustpilot-reminder" })).statusCode, 401); });
it("uses the owned campaign and country without exposing patient details", async () => {
 const response = await app.inject({ url: "/api/account/trustpilot-reminder", headers: { "x-test-user": "owner" } });
 assert.equal(response.statusCode, 200);
 assert.equal(response.json().data.campaignId, "campaign");
 assert.equal(response.json().data.localeCode, "pt-br");
 assert.equal(lookup.appointment.userId, "owner");
 assert.equal(lookup.appointment.status, "COMPLETED");
 assert.equal(lookup.stoppedAt, null);
 assert.deepEqual(stops, []);
});
it("cannot act on another patient's campaign", async () => {
 const response = await app.inject({ method: "POST", url: "/api/account/trustpilot-reminder", headers: { "x-test-user": "other" }, payload: { campaign: "campaign", action: "opted_out" } });
 assert.equal(response.statusCode, 404);
 assert.deepEqual(stops, []);
});
it("stops the owned campaign before returning the configured destination", async () => {
 const response = await app.inject({ method: "POST", url: "/api/account/trustpilot-reminder", headers: { "x-test-user": "owner" }, payload: { campaign: "campaign", action: "provider_opened", provider: "DOCTIFY" } });
 assert.equal(response.statusCode, 200);
 assert.deepEqual(stops, [["campaign", "provider_opened", "DOCTIFY"]]);
});
