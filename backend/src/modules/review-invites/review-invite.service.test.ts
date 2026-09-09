import assert from "node:assert/strict";
import { before, beforeEach, it, mock } from "node:test";
import { createHash } from "node:crypto";

let lookup: unknown;
let capability: { inviteId: string } | null = null;
let invite: { id: string; expiresAt: Date; submittedAt: Date | null } | null;
let queued = "";
let updated = false;
let service: typeof import("./review-invite.service.js");
before(async () => {
  mock.module("../../db/prisma.js", { namedExports: { prisma: {
    reviewInviteToken: { findUnique: async () => capability },
    reviewInvite: {
      findUnique: async (input: unknown) => { lookup = input; return invite; },
      update: async () => { updated = true; },
      count: async () => 0,
    },
  } } });
  mock.module("./review-campaign.service.js", { namedExports: {
    createReviewCampaignForAppointment: async (id: string) => { queued = id; return { id: "campaign" }; },
    scheduleReviewCampaigns: async () => ({ scanned: 2, queued: 1 }),
  } });
  service = await import("./review-invite.service.js");
});
beforeEach(() => {
  capability = null; queued = ""; updated = false;
  invite = { id: "campaign", expiresAt: new Date("2099-01-01"), submittedAt: null };
});
it("routes old issuance and cron entry points through the one campaign scheduler", async () => {
  await service.createReviewInviteForAppointment("appointment");
  assert.equal(queued, "appointment");
  assert.deepEqual(await service.dispatchDueTrustpilotInvites(), { scanned: 2, queued: 1, sent: 0, retrying: 0, skipped: 0, quotaRemaining: 0 });
});
it("supports hashed legacy links and new per-attempt links", async () => {
  await service.getReviewInviteByToken("synthetic-token");
  assert.deepEqual((lookup as { where: unknown }).where, { tokenHash: createHash("sha256").update("synthetic-token").digest("hex") });
  capability = { inviteId: "campaign" };
  await service.getReviewInviteByToken("another-token");
  assert.deepEqual((lookup as { where: unknown }).where, { id: "campaign" });
});
it("expired private feedback cannot be submitted", async () => {
  invite!.expiresAt = new Date("2000-01-01");
  const result = await service.submitReviewInvite("synthetic", {
    overallSatisfaction: 1, doctorProfessionalism: 1, communicationClarity: 1,
    timelinessOfService: 1, valueForMoney: 1, likeliness: 1, bookingExperience: 1,
  });
  assert.equal(result.ok, false);
  assert.equal(updated, false);
});
