import assert from "node:assert/strict";
import { before, beforeEach, it, mock } from "node:test";

const DAY = 86_400_000;
type Row = Record<string, unknown>;
let settings: Row;
let campaign: Row;
let delivery: Row;
let appointment: Row;
let countryEnabled = true;
let configured = true;
let suppressed = false;
let prior = false;
let created: Row | null;
let sends = 0;
let minted: Row[] = [];
let result: Row;
let stopBeforeClaim = false;
let service: typeof import("./review-campaign.service.js");

const tables = {
  country: { findMany: async () => [{ code: "br" }], findFirst: async () => ({ isActive: true }) },
  $executeRaw: async () => 1,
  $queryRaw: async () => [],
  appointment: { findUnique: async () => appointment, findFirst: async () => null, findMany: async () => [] },
  reviewSuppression: {
    findUnique: async () => suppressed ? { recipientKey: "recipient" } : null,
    findFirst: async () => suppressed ? { recipientKey: "recipient" } : null,
    upsert: async () => { suppressed = true; },
  },
  reviewInvite: {
    findUnique: async () => ({ ...campaign, appointment }),
    findFirst: async ({ where }: { where: Row }) => where.appointmentId ? created : prior ? { id: "prior" } : null,
    findMany: async () => [],
    create: async ({ data }: { data: Row }) => { created = { id: "new", ...data }; return created; },
    update: async ({ data }: { data: Row }) => Object.assign(campaign, data),
    updateMany: async ({ where, data }: { where: Row; data: Row }) => {
      if (where.stoppedAt === null && campaign.stoppedAt) return { count: 0 };
      Object.assign(campaign, data); return { count: 1 };
    },
  },
  reviewDelivery: {
    findUnique: async () => ({ ...delivery, invite: { ...campaign, appointment } }),
    update: async ({ data }: { data: Row }) => Object.assign(delivery, data),
    updateMany: async ({ where, data }: { where: Row; data: Row }) => {
      if (where.status && delivery.status !== where.status) return { count: 0 };
      const attempts = data.attempts ? Number(delivery.attempts) + 1 : delivery.attempts;
      Object.assign(delivery, data, { attempts }); return { count: 1 };
    },
  },
  reviewInviteToken: { create: async ({ data }: { data: Row }) => { minted.push(data); } },
  outbox: { updateMany: async () => ({ count: 1 }) },
};
const db = { ...tables, $transaction: async (run: (tx: typeof tables) => unknown): Promise<unknown> => {
  if (stopBeforeClaim) { campaign.stoppedAt = new Date(); stopBeforeClaim = false; }
  return run(tables);
} };

before(async () => {
  mock.module("../../db/prisma.js", { namedExports: { prisma: db } });
  mock.module("../../config/env.js", { namedExports: { env: { PUBLIC_SITE_URL: "https://example.test" } } });
  mock.module("../settings/settings.service.js", { namedExports: {
    getSetting: async () => settings,
    canSendReviewInviteForCountry: async () => countryEnabled,
  } });
  mock.module("../outbox/outbox.js", { namedExports: { OUTBOX_MAX_ATTEMPTS: 8 } });
  mock.module("../../lib/email/send-email.js", { namedExports: {
    isEmailConfigured: () => configured,
    sendEmail: async () => { sends++; return result; },
  } });
  mock.module("../../lib/email/templates.js", { namedExports: {
    buildReviewInviteEmail: () => ({ subject: "Review", html: "Review", text: "Review" }),
  } });
  service = await import("./review-campaign.service.js");
});
beforeEach(() => {
  const completedAt = new Date(Date.now() - 2 * DAY);
  settings = { enabled: true, activatedAt: new Date(Date.now() - 10 * DAY).toISOString(), delayHours: 24, maxFollowups: 1, followupIntervalDays: 7 };
  appointment = { id: "appointment", status: "COMPLETED", consultationCompletedAt: completedAt, email: "patient@example.test", countryCode: "BR", notificationLocale: null, fullName: "Test Patient" };
  campaign = { id: "invite", countryCode: "BR", recipientKey: "recipient", completedAt, nextSendAt: new Date(Date.now() - DAY), expiresAt: new Date(Date.now() + 58 * DAY), stoppedAt: null, contactEmail: "patient@example.test", maxFollowups: 1, followupIntervalDays: 7, localeCode: "pt-br" };
  delivery = { id: "delivery", inviteId: "invite", stage: 0, status: "PENDING", attempts: 0 };
  result = { ok: true, mode: "smtp", id: "message" };
  countryEnabled = true; configured = true; suppressed = false; prior = false;
  created = null; sends = 0; minted = []; stopBeforeClaim = false;
});
it("defaults off and bounds the configurable reminder count", () => {
  assert.equal(service.reviewAutomationSchema.parse({}).enabled, false);
  assert.equal(service.reviewAutomationSchema.safeParse({ maxFollowups: 3 }).success, false);
  const sent = new Date("2026-09-10T10:00:00Z");
  for (const limit of [0, 1, 2]) {
    assert.equal(service.nextReviewSendAt(sent, limit, limit, 7), null);
    if (limit) assert.equal(service.nextReviewSendAt(sent, 0, limit, 7)?.toISOString(), "2026-09-17T10:00:00.000Z");
  }
});
it("queues after true completion, keeps the locale, and never sends inline", async () => {
  const row = await service.createReviewCampaignForAppointment("appointment");
  assert.equal(row?.localeCode, "pt-br");
  assert.equal(row?.nextSendAt?.getTime(), (appointment.consultationCompletedAt as Date).getTime() + DAY);
  assert.equal(sends, 0);
  assert.equal((await service.createReviewCampaignForAppointment("appointment"))?.id, row?.id);
});
it("rejects bookings, pre-activation history, paused countries and repeat recipients", async () => {
  appointment.status = "BOOKED";
  assert.equal(await service.createReviewCampaignForAppointment("appointment"), null);
  appointment.status = "COMPLETED"; settings.activatedAt = new Date().toISOString();
  assert.equal(await service.createReviewCampaignForAppointment("appointment"), null);
  settings.activatedAt = new Date(Date.now() - 10 * DAY).toISOString(); countryEnabled = false;
  assert.equal(await service.createReviewCampaignForAppointment("appointment"), null);
  countryEnabled = true; prior = true;
  assert.equal(await service.createReviewCampaignForAppointment("appointment"), null);
});
it("counts provider acceptance once and retains only hashed capabilities", async () => {
  await service.dispatchReviewDelivery("delivery"); await service.dispatchReviewDelivery("delivery");
  assert.equal(sends, 1); assert.equal(delivery.status, "SENT");
  assert.equal(minted.length, 1); assert.match(String(minted[0].tokenHash), /^[a-f0-9]{64}$/);
  assert.equal((campaign.nextSendAt as Date).getTime(), (delivery.sentAt as Date).getTime() + 7 * DAY);
});
it("the last configured follow-up terminates the sequence", async () => {
  delivery.stage = 1;
  await service.dispatchReviewDelivery("delivery");
  assert.equal(campaign.nextSendAt, null); assert.equal(campaign.stopReason, "sequence_complete");
});
it("known nonacceptance retries without spending a follow-up", async () => {
  result = { ok: false, notAccepted: true, mode: "smtp" };
  await assert.rejects(service.dispatchReviewDelivery("delivery"), /retry/i);
  assert.equal(delivery.status, "PENDING"); assert.equal(delivery.stage, 0);
  result = { ok: true, mode: "smtp", id: "message" };
  await service.dispatchReviewDelivery("delivery");
  assert.equal(delivery.status, "SENT"); assert.equal(delivery.attempts, 2);
});
it("unknown acceptance and stale in-flight attempts cannot send again", async () => {
  result = { ok: false, mode: "smtp", notAccepted: false };
  await service.dispatchReviewDelivery("delivery"); assert.equal(delivery.status, "UNKNOWN");
  await service.dispatchReviewDelivery("delivery"); assert.equal(sends, 1);
  delivery.status = "SENDING"; sends = 0;
  await service.dispatchReviewDelivery("delivery");
  assert.equal(delivery.status, "UNKNOWN"); assert.equal(sends, 0);
});
it("global pause and a stop arriving before the claim prevent sending", async () => {
  settings.enabled = false;
  await service.dispatchReviewDelivery("delivery"); assert.equal(sends, 0);
  settings.enabled = true; stopBeforeClaim = true;
  await service.dispatchReviewDelivery("delivery"); assert.equal(sends, 0);
});
it("missing transport cannot mint or log patient capabilities", async () => {
  configured = false;
  await service.dispatchReviewDelivery("delivery");
  assert.equal(delivery.status, "FAILED");
  assert.equal(minted.length, 0); assert.equal(sends, 0);
});
it("does not send early or exceed a lowered follow-up limit", async () => {
  campaign.nextSendAt = new Date(Date.now() + DAY);
  await service.dispatchReviewDelivery("delivery");
  assert.equal(sends, 0);
  campaign.nextSendAt = new Date(Date.now() - DAY);
  delivery.stage = 1; settings.maxFollowups = 0;
  await service.dispatchReviewDelivery("delivery");
  assert.equal(sends, 0); assert.equal(delivery.status, "CANCELLED");
});
it("expires old sequences and bounds known-failure retries", async () => {
  campaign.completedAt = new Date(Date.now() - 46 * DAY);
  await service.dispatchReviewDelivery("delivery");
  assert.equal(sends, 0);
  campaign.completedAt = new Date(Date.now() - 2 * DAY);
  campaign.stoppedAt = null; campaign.nextSendAt = new Date(Date.now() - DAY);
  delivery.status = "PENDING"; delivery.attempts = 7;
  result = { ok: false, notAccepted: true, mode: "smtp" };
  await service.dispatchReviewDelivery("delivery");
  assert.equal(delivery.status, "FAILED"); assert.equal(campaign.nextSendAt, null);
});
it("opt-out stops the sequence and suppresses future contact", async () => {
  await service.stopReviewCampaign("invite", "opted_out");
  assert.equal(suppressed, true); assert.equal(campaign.nextSendAt, null);
  assert.equal(delivery.status, "CANCELLED");
  assert.equal(await service.createReviewCampaignForAppointment("appointment"), null);
});
it("opt-out preserves provider selection and the separate self-report", async () => {
  await service.stopReviewCampaign("invite", "provider_opened", "doctify");
  await service.stopReviewCampaign("invite", "patient_reviewed");
  await service.stopReviewCampaign("invite", "opted_out");
  assert.equal(campaign.selectedProvider, "doctify");
  assert.ok(campaign.patientReviewedAt instanceof Date);
  assert.equal(campaign.stopReason, "opted_out");
});
