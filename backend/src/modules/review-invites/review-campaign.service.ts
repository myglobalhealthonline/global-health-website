import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { getSetting, canSendReviewInviteForCountry } from "../settings/settings.service.js";
import { resolveUniversalReviewInviteRouting } from "./review-destinations.js";
import { OUTBOX_MAX_ATTEMPTS } from "../outbox/outbox.js";
import { sendEmail, isEmailConfigured } from "../../lib/email/send-email.js";
import { buildReviewInviteEmail } from "../../lib/email/templates.js";

const DAY = 86_400_000;
export const reviewAutomationSchema = z.object({
  enabled: z.boolean().default(false), activatedAt: z.string().datetime().nullable().default(null),
  delayHours: z.number().int().min(1).max(168).default(24),
  maxFollowups: z.number().int().min(0).max(2).default(1),
  followupIntervalDays: z.number().int().min(3).max(14).default(7),
});
export async function getReviewAutomationSettings() {
  const result = reviewAutomationSchema.safeParse(await getSetting("review.automation") ?? {});
  return result.success ? result.data : reviewAutomationSchema.parse({});
}
export const reviewTokenHash = (value: string) => createHash("sha256").update(value).digest("hex");

// Contact identity covers guest and account bookings, across markets. Preserve
// ordinary case-insensitive email semantics; never invent Gmail alias rules.
export const reviewRecipientKey = (email: string) => reviewTokenHash(email.trim().toLowerCase());

function suppressionKeys(appt: { email: string; patientProfileId?: string | null; userId?: string | null }) {
  return [reviewRecipientKey(appt.email), ...(appt.patientProfileId ? [reviewTokenHash("patient:"+appt.patientProfileId)] : []), ...(appt.userId ? [reviewTokenHash("user:"+appt.userId)] : [])];
}

export function nextReviewSendAt(sentAt: Date, stage: number, limit: number, intervalDays: number): Date | null {
  return stage >= limit ? null : new Date(sentAt.getTime() + intervalDays * DAY);
}

export async function createReviewCampaignForAppointment(appointmentId: string, now = new Date()) {
  const settings = await getReviewAutomationSettings();
  if (!settings.enabled || !settings.activatedAt) return null;
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId }, include: {
    user: { select: { isActive: true, deletionScheduledAt: true } },
    patientProfile: { select: { isMerged: true, anonymizedAt: true, deletionRequests: { where: { requestStatus: { not: "REJECTED" } }, take: 1, select: { id: true } } } },
  } });
  if (!appt || appt.status !== "COMPLETED" || !appt.consultationCompletedAt ||
      appt.consultationCompletedAt < new Date(settings.activatedAt) ||
      appt.consultationCompletedAt.getTime() + 45 * DAY <= now.getTime() ||
      !z.string().email().safeParse(appt.email).success || appt.user?.isActive === false || appt.user?.deletionScheduledAt ||
      appt.patientProfile?.isMerged || appt.patientProfile?.anonymizedAt || appt.patientProfile?.deletionRequests.length ||
      !(await canSendReviewInviteForCountry(appt.countryCode))) return null;
  const activeCountries = await prisma.country.findMany({ where: { isActive: true, code: { in: ["IE","CZ","PT","ES","RO","BR"] } }, select: { code: true } });
  if (!activeCountries.some(country => country.code === appt.countryCode)) return null;
  const eligibleCountries = (await Promise.all(activeCountries.map(({ code }) => code).map(async code =>
    await canSendReviewInviteForCountry(code) ? code : null))).filter((code): code is string => code !== null);
  const recipientKey = reviewRecipientKey(appt.email);
  return prisma.$transaction(async tx => {
    // Shared identity lock serializes overlapping doctor/admin/discovery calls.
    // ponytail: global creation lock; use ordered identity locks if creation volume warrants it.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(78219432)`;
    const existing = await tx.reviewInvite.findFirst({ where: { appointmentId, campaignVersion: 1 } });
    if (existing) return existing;
    if (await tx.reviewSuppression.findFirst({ where: { recipientKey: { in: suppressionKeys(appt) } } })) return null;
    const identity = [ { email: { equals: appt.email, mode: "insensitive" as const } },
      ...(appt.patientProfileId ? [{ patientProfileId: appt.patientProfileId }] : []),
      ...(appt.userId ? [{ userId: appt.userId }] : []) ];
    const prior = await tx.reviewInvite.findFirst({ where: { OR: [{recipientKey}, {appointment:{OR:identity}}], campaignVersion: 1,
      completedAt: { gte: new Date(appt.consultationCompletedAt!.getTime() - 90 * DAY) } } });
    if (prior) return null;
    const earlier = await tx.appointment.findFirst({ where: { OR: identity, status: "COMPLETED",
      countryCode: { in: eligibleCountries }, email: { not: "" },
      consultationCompletedAt: { gte: new Date(Math.max(new Date(settings.activatedAt!).getTime(), now.getTime()-45*DAY)), lt: appt.consultationCompletedAt! },
    }, select: { id: true } });
    if (earlier) return null;
    return tx.reviewInvite.create({ data: {
      appointmentId, campaignVersion: 1, countryCode: appt.countryCode, recipientKey,
      completedAt: appt.consultationCompletedAt, contactEmail: appt.email, customerName: appt.fullName,
      localeCode: resolveUniversalReviewInviteRouting(appt).localeCode,
      tokenHash: reviewTokenHash(randomBytes(32).toString("base64url")),
      expiresAt: new Date(appt.consultationCompletedAt!.getTime() + 60 * DAY),
      nextSendAt: new Date(appt.consultationCompletedAt!.getTime() + settings.delayHours * 3_600_000),
      maxFollowups: settings.maxFollowups, followupIntervalDays: settings.followupIntervalDays,
    } });
  });
}

export async function stopReviewCampaign(inviteId: string, reason: string, provider?: string) {
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "ReviewInvite" WHERE id = ${inviteId} FOR UPDATE`;
    const invite = await tx.reviewInvite.findUnique({ where: { id: inviteId }, include: { appointment: true } });
    if (!invite) return;
    // Keep review evidence when a patient later opts out. A site selection is
    // still only a selection; never infer a posted review from it.
    if (reason === "patient_reviewed" || (reason === "provider_opened" && provider)) {
      await tx.reviewInvite.update({ where: { id: inviteId }, data: {
        ...(reason === "patient_reviewed" ? { patientReviewedAt: invite.patientReviewedAt ?? new Date() } : { selectedProvider: provider }),
      } });
    }
    if (reason === "opted_out" && invite.contactEmail) {
      const recipientKey = reviewRecipientKey(invite.contactEmail);
      for (const key of new Set([recipientKey, ...suppressionKeys(invite.appointment ?? { email: invite.contactEmail })])) {
        await tx.reviewSuppression.upsert({ where: { recipientKey: key }, create: { recipientKey: key }, update: {} });
      }
      await tx.reviewInvite.updateMany({ where: { recipientKey, stoppedAt: null },
        data: { stoppedAt: new Date(), stopReason: reason, nextSendAt: null } });
    }
    // Opt-out remains possible even after selection/sequence exhaustion.
    await tx.reviewInvite.updateMany({ where: { id: inviteId, ...(reason === "opted_out" ? {} : { OR: [{ stoppedAt: null }, { stopReason: "sequence_complete" }, ...(reason === "patient_reviewed" ? [{ stopReason: "provider_opened" }] : [])] }) },
      data: { stoppedAt: new Date(), stopReason: reason, nextSendAt: null } });
    await tx.reviewDelivery.updateMany({ where: { inviteId, status: "PENDING" }, data: { status: "CANCELLED" } });
  });
}

export async function scheduleReviewCampaigns(now = new Date()) {
  const settings = await getReviewAutomationSettings();
  if (!settings.enabled || !settings.activatedAt) return { scanned: 0, queued: 0 };
  // Durable ID cursor plus full bounded-cycle scan catches late completion and
  // administrative changes without depending on mutable appointment updatedAt.
  const cursor = await getSetting<{ time: string; id: string }>("review.discoveryCursor");
  const appointments = await prisma.appointment.findMany({ where: {
    status: "COMPLETED", consultationCompletedAt: { gte: new Date(settings.activatedAt) },
    ...(cursor?.time ? { OR: [{ consultationCompletedAt: { gt: new Date(cursor.time) } }, { consultationCompletedAt: new Date(cursor.time), id: { gt: cursor.id } }] } : {}),
  }, orderBy: [{ consultationCompletedAt: "asc" }, { id: "asc" }], take: 100 });
  // Sort each discovery batch by completion so the earliest appointment wins.
  for (const appt of [...appointments].sort((a,b) => a.consultationCompletedAt!.getTime()-b.consultationCompletedAt!.getTime())) {
    await createReviewCampaignForAppointment(appt.id, now);
  }
  await prisma.setting.upsert({ where: { key: "review.discoveryCursor" },
    create: { key: "review.discoveryCursor", value: appointments.length === 100 ? { time: appointments.at(-1)!.consultationCompletedAt!.toISOString(), id: appointments.at(-1)!.id } : {} },
    update: { value: appointments.length === 100 ? { time: appointments.at(-1)!.consultationCompletedAt!.toISOString(), id: appointments.at(-1)!.id } : {} } });
  const due = await prisma.reviewInvite.findMany({ where: { campaignVersion: 1, stoppedAt: null, nextSendAt: { lte: now } },
    orderBy: { nextSendAt: "asc" }, take: 100, include: { deliveries: true } });
  let queued = 0;
  for (const invite of due) {
    const stage = invite.deliveries.filter(d => d.status === "SENT").length;
    if (stage > Math.min(settings.maxFollowups, invite.maxFollowups) || !invite.completedAt || now.getTime() >= invite.completedAt.getTime()+45*DAY) {
      await stopReviewCampaign(invite.id, stage > Math.min(settings.maxFollowups, invite.maxFollowups) ? "sequence_complete" : "expired"); continue;
    }
    await prisma.$transaction(async tx => {
      const delivery = await tx.reviewDelivery.upsert({ where: { inviteId_stage: { inviteId: invite.id, stage } },
        create: { inviteId: invite.id, stage }, update: {} });
      if (delivery.status === "PENDING") await tx.outbox.updateMany({
        where: { idempotencyKey: `review_campaign_email:${delivery.id}`, status: "SENT" },
        data: { status: "PENDING", attempts: 0, lastAttemptAt: null },
      });
      await tx.outbox.createMany({ data: [{ kind: "review_campaign_email", idempotencyKey: `review_campaign_email:${delivery.id}`, payload: { deliveryId: delivery.id } }], skipDuplicates: true });
    });
    queued++;
  }
  return { scanned: appointments.length, queued };
}

export async function dispatchReviewDelivery(deliveryId: string) {
  const delivery = await prisma.reviewDelivery.findUnique({ where: { id: deliveryId }, include: { invite: { include: { appointment: { include: { user: { select: { isActive: true, deletionScheduledAt: true } }, patientProfile: { select: { isMerged: true, anonymizedAt: true, deletionRequests: { where: { requestStatus: { not: "REJECTED" } }, take: 1, select: { id: true } } } } } } } } } });
  if (!delivery || ["SENT","FAILED","UNKNOWN","CANCELLED"].includes(delivery.status)) return;
  if (delivery.status === "SENDING") {
    // A timeout/crash may have delivered. Never reclaim this network attempt.
    await prisma.reviewDelivery.updateMany({ where: { id: deliveryId, status: "SENDING" }, data: { status: "UNKNOWN", error: "Provider acceptance unknown; do not resend" } });
    await prisma.reviewInvite.updateMany({ where: { id: delivery.inviteId, stoppedAt: null }, data: { nextSendAt: null } });
    return;
  }
  const { invite } = delivery;
  const patient = invite.appointment?.patientProfile;
  const user = invite.appointment?.user;
  const country = invite.countryCode ? await prisma.country.findUnique({ where: { code: invite.countryCode }, select: { isActive: true } }) : null;
  const settings = await getReviewAutomationSettings();
  if (!settings.enabled || !(await canSendReviewInviteForCountry(invite.countryCode))) {
    return;
  }
  if (!country?.isActive || !z.string().email().safeParse(invite.appointment?.email ?? invite.contactEmail).success || patient?.isMerged || patient?.anonymizedAt || patient?.deletionRequests.length || user?.isActive === false || user?.deletionScheduledAt || invite.stoppedAt || invite.appointment?.status !== "COMPLETED" || !invite.completedAt ||
      Date.now() >= invite.completedAt.getTime()+45*DAY || delivery.stage > Math.min(settings.maxFollowups,invite.maxFollowups) ||
      !invite.contactEmail || await prisma.reviewSuppression.findFirst({ where: { recipientKey: { in: suppressionKeys(invite.appointment ?? { email: invite.contactEmail ?? "" }) } } })) {
    await stopReviewCampaign(invite.id, "ineligible"); return;
  }
  if (!isEmailConfigured()) {
    // This is known nonacceptance: expose it for operator retry, never mint a
    // capability or leave an exhausted outbox row masquerading as queued work.
    await prisma.$transaction(async tx => {
      const failed = await tx.reviewDelivery.updateMany({ where: { id: deliveryId, status: "PENDING" },
        data: { status: "FAILED", error: "Review email transport is not configured" } });
      if (failed.count) await tx.reviewInvite.updateMany({ where: { id: invite.id, stoppedAt: null }, data: { nextSendAt: null } });
    });
    return;
  }
  const token = randomBytes(32).toString("base64url");
  const claimed = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "ReviewInvite" WHERE id = ${invite.id} FOR UPDATE`;
    const fresh = await tx.reviewInvite.findUnique({ where: { id: invite.id } });
    if (!fresh || fresh.stoppedAt || !fresh.nextSendAt || fresh.nextSendAt > new Date() || fresh.expiresAt <= new Date() ||
      await tx.reviewSuppression.findFirst({ where: { recipientKey: { in: suppressionKeys(invite.appointment ?? { email: invite.contactEmail! }) } } })) return false;
    const claim = await tx.reviewDelivery.updateMany({ where: { id: deliveryId, status: "PENDING" },
      data: { status: "SENDING", attempts: { increment: 1 }, attemptedAt: new Date(), error: null } });
    if (claim.count) await tx.reviewInviteToken.create({ data: { inviteId: invite.id, tokenHash: reviewTokenHash(token) } });
    return claim.count === 1;
  });
  if (!claimed) return;
  const link = `${(env.PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "")}/reviews/rate?token=${encodeURIComponent(token)}&lang=${encodeURIComponent(invite.localeCode ?? "en")}`;
  let result;
  try { result = await sendEmail({ to: invite.appointment?.email ?? invite.contactEmail!, ...buildReviewInviteEmail({ link, localeCode: invite.localeCode ?? "en", reminder: delivery.stage > 0 }) }); }
  catch { result = null; }
  if (result?.ok && result.mode !== "log") {
    const sentAt = new Date();
    const current = await getReviewAutomationSettings();
    const nextSendAt = nextReviewSendAt(sentAt,delivery.stage,Math.min(current.maxFollowups,invite.maxFollowups),invite.followupIntervalDays);
    await prisma.$transaction(async tx => {
      await tx.reviewDelivery.update({ where: { id: deliveryId }, data: { status: "SENT", sentAt, providerMessageId: result.id, error: null } });
      await tx.reviewInvite.updateMany({ where: { id: invite.id, stoppedAt: null }, data: {
        nextSendAt, ...(nextSendAt ? {} : { stoppedAt: sentAt, stopReason: "sequence_complete" }),
      } });
    });
    return;
  }
  const known = result && (result.ok ? result.mode === "log" : result.notAccepted === true);
  const retry = known && delivery.attempts + 1 < OUTBOX_MAX_ATTEMPTS;
  await prisma.reviewDelivery.update({ where: { id: deliveryId }, data: {
    status: retry ? "PENDING" : known ? "FAILED" : "UNKNOWN",
    error: known ? "Email not accepted" : "Provider acceptance unknown; do not resend",
  } });
  if (!retry) await prisma.reviewInvite.updateMany({ where: { id: invite.id, stoppedAt: null }, data: { nextSendAt: null } });
  if (retry) throw new Error("Review email not accepted; retry pending");
}

export async function retryReviewDelivery(deliveryId: string): Promise<boolean> {
  return prisma.$transaction(async tx => {
    const row = await tx.reviewDelivery.findUnique({ where: { id: deliveryId }, include: { invite: true } });
    if (!row || row.status !== "FAILED" || row.invite.stoppedAt || row.invite.expiresAt <= new Date()) return false;
    await tx.reviewDelivery.update({ where: { id: deliveryId }, data: { status: "PENDING", attempts: 0, error: null } });
    await tx.reviewInvite.update({ where: { id: row.inviteId }, data: { nextSendAt: new Date() } });
    await tx.outbox.updateMany({ where: { idempotencyKey: `review_campaign_email:${deliveryId}` }, data: { status: "PENDING", attempts: 0, lastAttemptAt: null, lastError: null } });
    return true;
  });
}
