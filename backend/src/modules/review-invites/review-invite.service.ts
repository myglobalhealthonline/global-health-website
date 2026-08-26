import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { sendReviewInviteEmail } from "../../lib/email/templates.js";
import { sendWhatsAppText } from "../../lib/whatsapp/wasender.js";
import { getReviewFormLocale } from "../../lib/i18n/review-form.js";
import {
  isTrustpilotAfsConfigured,
  sendTrustpilotAfsTrigger,
  toTrustpilotLocale,
} from "../../lib/trustpilot/afs-trigger.js";
import { resolveUniversalReviewInviteRouting } from "./review-destinations.js";
import { canSendReviewInviteForCountry } from "../settings/settings.service.js";

const INVITE_TTL_DAYS = 14;

/** Rows handled per cron tick. Keeps a backlog from monopolising one run. */
const TRUSTPILOT_DISPATCH_BATCH = 50;

function reviewUrl(token: string): string {
  const base = (env.PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/reviews/rate?token=${encodeURIComponent(token)}`;
}

// S-009: only the SHA-256 hash is persisted — the raw token exists only in
// the URL emailed/WhatsApp'd to the patient, never in the DB.
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** First name only — all Trustpilot needs, and the least we can disclose. */
function firstName(fullName: string | null | undefined): string {
  const trimmed = (fullName ?? "").trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0];
}

/** Start of the current calendar month, UTC — the window Trustpilot's Free
 *  plan quota resets on. */
function startOfCurrentMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Trustpilot invitations already spent this calendar month. Counts rows we
 * actually got through to Trustpilot (dispatched, no error) — skipped and
 * failed rows never reached them and must not consume quota.
 */
export async function trustpilotInvitesUsedThisMonth(now = new Date()): Promise<number> {
  return prisma.reviewInvite.count({
    where: {
      channel: "TRUSTPILOT",
      dispatchError: null,
      dispatchedAt: { gte: startOfCurrentMonth(now) },
    },
  });
}

/**
 * Create (and for the internal channel, send) the review invite for a
 * completed appointment.
 *
 * Every completed appointment receives the same Global Health review hub.
 * The hub collects first-party feedback and, after submission, exposes the
 * appointment country's Google/Doctify destinations plus the one global
 * Trustpilot destination. Historical TRUSTPILOT rows remain dispatchable, but
 * new rows are no longer selected by a doctor-level toggle.
 *
 * Idempotent per appointment in both cases: an existing unsubmitted, unexpired
 * invite is returned as-is rather than duplicated.
 */
export async function createReviewInviteForAppointment(appointmentId: string) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      doctor: { select: { fullName: true } },
      service: { select: { name: true } },
    },
  });
  if (!appt || appt.status !== "COMPLETED") return null;
  if (!(await canSendReviewInviteForCountry(appt.countryCode))) return null;

  const existing = await prisma.reviewInvite.findFirst({
    where: {
      appointmentId,
      submittedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    return existing;
  }

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
  const routing = resolveUniversalReviewInviteRouting({
    countryCode: appt.countryCode,
    notificationLocale: appt.notificationLocale,
  });

  const invite = await prisma.reviewInvite.create({
    data: {
      tokenHash: hashToken(token),
      appointmentId: appt.id,
      customerName: appt.fullName,
      contactEmail: appt.email,
      contactPhone: appt.phone,
      doctorName: appt.doctor ? appt.doctor.fullName.trim() : null,
      serviceName: appt.service?.name ?? appt.consultationType,
      localeCode: routing.localeCode,
      expiresAt,
      channel: routing.channel,
      scheduledFor: routing.scheduledFor,
    },
  });

  const locale = getReviewFormLocale(routing.localeCode);
  const link = reviewUrl(token);
  // The invite row is already persisted. Treat delivery as best-effort so a
  // failed email/WhatsApp send doesn't throw back to the caller (which would
  // make it retry and create duplicate invites). Failures are logged.
  await sendReviewInviteEmail({
    to: appt.email,
    patientName: appt.fullName,
    link,
    localeTitle: locale.title,
  }).catch((err) => {
    console.error("[review-invite] email send failed", { appointmentId: appt.id, err });
  });

  if (appt.phone) {
    await sendWhatsAppText({
      to: appt.phone,
      message: `${locale.title}\n${link}`,
    }).catch((err) => {
      console.error("[review-invite] whatsapp send failed", { appointmentId: appt.id, err });
    });
  }

  return invite;
}

export type TrustpilotDispatchSummary = {
  /** Due rows examined this tick. */
  scanned: number;
  /** Triggers Trustpilot accepted. */
  sent: number;
  /** Rows retried later after a transient send failure. */
  retrying: number;
  /** Rows closed without inviting (quota spent, or AFS unconfigured). */
  skipped: number;
  /** Invitations left in this calendar month's Free-plan allowance. */
  quotaRemaining: number;
};

/**
 * Send the Trustpilot AFS trigger for every invite whose 24h delay has
 * elapsed. Driven by POST /api/cron/trustpilot-invites.
 *
 * Quota: Trustpilot's Free plan takes 50 invitations per calendar month and
 * drops the rest silently. We count our own sends and stop at the limit, so
 * the failure is visible in `dispatchError` instead of being invisible on
 * Trustpilot's side. Rows skipped for quota are closed, not retried — next
 * month's patients are more useful than this month's backlog.
 *
 * Never throws: a per-row failure is recorded and picked up on the next tick.
 */
export async function dispatchDueTrustpilotInvites(
  now = new Date(),
): Promise<TrustpilotDispatchSummary> {
  const due = await prisma.reviewInvite.findMany({
    where: {
      channel: "TRUSTPILOT",
      dispatchedAt: null,
      scheduledFor: { lte: now },
    },
    orderBy: { scheduledFor: "asc" },
    take: TRUSTPILOT_DISPATCH_BATCH,
  });

  const limit = env.TRUSTPILOT_MONTHLY_INVITE_LIMIT;
  let used = await trustpilotInvitesUsedThisMonth(now);

  const summary: TrustpilotDispatchSummary = {
    scanned: due.length,
    sent: 0,
    retrying: 0,
    skipped: 0,
    quotaRemaining: Math.max(0, limit - used),
  };

  if (due.length === 0) return summary;

  if (!isTrustpilotAfsConfigured()) {
    // Nothing is configured, so nothing can ever be delivered. Close the rows
    // rather than accumulating an unbounded backlog of retries.
    await prisma.reviewInvite.updateMany({
      where: { id: { in: due.map((row) => row.id) } },
      data: {
        dispatchedAt: now,
        dispatchError: "Trustpilot AFS trigger address is not configured",
      },
    });
    summary.skipped = due.length;
    return summary;
  }

  for (const row of due) {
    if (used >= limit) {
      await prisma.reviewInvite.update({
        where: { id: row.id },
        data: {
          dispatchedAt: now,
          dispatchError: `Trustpilot monthly invitation quota (${limit}) already spent`,
        },
      });
      summary.skipped += 1;
      continue;
    }

    if (!row.contactEmail) {
      await prisma.reviewInvite.update({
        where: { id: row.id },
        data: { dispatchedAt: now, dispatchError: "No patient email on the invite" },
      });
      summary.skipped += 1;
      continue;
    }

    const locale = toTrustpilotLocale(row.localeCode);
    const result = await sendTrustpilotAfsTrigger({
      customerEmail: row.contactEmail,
      customerName: firstName(row.customerName),
      referenceId: row.appointmentId ?? row.id,
      ...(locale ? { locale } : {}),
    });

    if (result.ok) {
      await prisma.reviewInvite.update({
        where: { id: row.id },
        data: { dispatchedAt: new Date(), dispatchError: null },
      });
      used += 1;
      summary.sent += 1;
    } else {
      // Transient — leave dispatchedAt null so the next tick retries it.
      await prisma.reviewInvite.update({
        where: { id: row.id },
        data: { dispatchError: result.message.slice(0, 1000) },
      });
      summary.retrying += 1;
      console.error("[trustpilot-invite] trigger failed", {
        inviteId: row.id,
        message: result.message,
      });
    }
  }

  summary.quotaRemaining = Math.max(0, limit - used);
  return summary;
}

export async function getReviewInviteByToken(token: string) {
  return prisma.reviewInvite.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      appointment: {
        select: { id: true, fullName: true, countryCode: true },
      },
    },
  });
}

export async function submitReviewInvite(
  token: string,
  ratings: {
    overallSatisfaction: number;
    doctorProfessionalism: number;
    communicationClarity: number;
    timelinessOfService: number;
    valueForMoney: number;
    likeliness: number;
    bookingExperience: number;
  },
) {
  const invite = await prisma.reviewInvite.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!invite) return { ok: false as const, message: "Review not found" };
  if (invite.submittedAt) return { ok: false as const, message: "Review already submitted" };
  if (invite.expiresAt < new Date()) {
    return { ok: false as const, message: "Review link has expired" };
  }

  await prisma.reviewInvite.update({
    where: { id: invite.id },
    data: {
      ...ratings,
      submittedAt: new Date(),
    },
  });
  return { ok: true as const };
}
