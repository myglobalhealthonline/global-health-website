import type { FastifyBaseLogger } from "fastify";
import type { NotificationType } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { absoluteSiteUrl } from "../../lib/email/send-email.js";
import {
  sendSupportMessageAlertEmail,
  sendSupportReplyDoctorAlertEmail,
} from "../../lib/email/templates.js";
import { sendWhatsAppText, formatWhatsAppSendError } from "../../lib/whatsapp/wasender.js";
import {
  resolveDoctorContact,
  formatDoctorGreetingName,
} from "../../lib/whatsapp/resolve-doctor-contact.js";
import {
  adminNotifyEmails,
  adminNotifyWhatsAppNumbers,
} from "../automation/admin-booking-alert.service.js";
import type { NotificationPayload } from "../notifications/notify.service.js";

/**
 * Fan-out for the doctor ↔ support (admin team) chat.
 *
 * Deliberately does NOT reuse `notifyAdmins`: that helper filters
 * `role: "ADMIN"` only, so a SUPER_ADMIN silently receives no in-portal
 * notification. Support threads are answered by whoever is around, so the bell
 * and the email must reach the same set of people — every active global admin.
 * (Widening `notifyAdmins` itself would change INTERNAL_MESSAGE /
 * PATIENT_MESSAGE behaviour, so that stays out of scope here.)
 *
 * Every function is best-effort and must never throw into the request path: a
 * failed notification must not fail the message the doctor just sent.
 */

/** Roles that see the support inbox. LOCAL_ADMIN is excluded — a
 *  country-scoped admin must not read every doctor's support thread. */
const SUPPORT_ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;

/** Safety cap on fan-out, matching notifyAdmins. Not a business rule. */
const ADMIN_FANOUT_CAP = 20;

/** Deep link an admin lands on from the alert email. */
export function supportThreadAdminUrl(threadId: string): string {
  return absoluteSiteUrl(`/admin/support?open=${encodeURIComponent(threadId)}`);
}

/**
 * Deep link the doctor lands on. The doctor has exactly one thread, so the
 * page needs no id — the thread is resolved from their session.
 */
export function supportThreadDoctorUrl(): string {
  return absoluteSiteUrl("/doctor/support");
}

/** Shared throttle window for both directions of the support chat. */
function supportThrottleCutoff(now: Date): Date {
  return new Date(now.getTime() - env.SUPPORT_ALERT_THROTTLE_MINUTES * 60 * 1000);
}

/**
 * Email recipients for support alerts. DB-first so the email and bell audiences
 * are identical by construction and self-maintain when a new admin is
 * onboarded; `ADMIN_NOTIFY_EMAILS` is only a safety net for a database with no
 * admin rows at all.
 */
export async function resolveSupportAdminEmails(): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: { role: { in: [...SUPPORT_ADMIN_ROLES] }, isActive: true },
    select: { email: true },
    take: ADMIN_FANOUT_CAP,
  });
  const emails = Array.from(
    new Set(admins.map((a) => a.email.trim()).filter(Boolean)),
  );
  return emails.length > 0 ? emails : adminNotifyEmails();
}

/** In-portal bell row for every active global admin. */
export async function notifySupportAdmins(
  type: NotificationType,
  payload: NotificationPayload,
): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { role: { in: [...SUPPORT_ADMIN_ROLES] }, isActive: true },
    select: { id: true },
    take: ADMIN_FANOUT_CAP,
  });
  if (admins.length === 0) return;
  await prisma.notification.createMany({
    data: admins.map((a) => ({ recipientUserId: a.id, type, payload })),
  });
}

/**
 * Email the admin team that a doctor wrote in — throttled per thread.
 *
 * The window is claimed with a conditional `updateMany`, not a read-then-write:
 * two concurrent POSTs would both pass a plain staleness check and double-send.
 * Whichever request wins the update sends; the loser returns silently and the
 * doctor's message still produces bell rows.
 *
 * Never throws. Never blocks the caller's response — invoke as
 * `void alertAdminsOfSupportMessage(...)`.
 */
export async function alertAdminsOfSupportMessage(args: {
  threadId: string;
  doctorName: string;
  snippet: string | null;
  log: FastifyBaseLogger;
}): Promise<void> {
  const { threadId, doctorName, snippet, log } = args;
  try {
    const now = new Date();
    const cutoff = supportThrottleCutoff(now);

    const claimed = await prisma.supportThread.updateMany({
      where: {
        id: threadId,
        OR: [{ lastAdminEmailAt: null }, { lastAdminEmailAt: { lt: cutoff } }],
      },
      data: { lastAdminEmailAt: now },
    });
    if (claimed.count === 0) {
      log.info(
        { threadId },
        "support alert email suppressed — inside throttle window (bell only)",
      );
      return;
    }

    const threadUrl = supportThreadAdminUrl(threadId);

    // WhatsApp first — same window, same claim, so the two channels can never
    // disagree about whether this message was already alerted on.
    const numbers = adminNotifyWhatsAppNumbers();
    const waText = `${doctorName} has sent a text in the doctor support chat${snippet ? `:
"${snippet}"` : "."}

${threadUrl}`;
    const waResults = await Promise.allSettled(
      numbers.map((to) => sendWhatsAppText({ to, message: waText })),
    );
    waResults.forEach((r, i) => {
      if (r.status === "rejected") {
        log.warn({ threadId, to: numbers[i], err: r.reason }, "support admin WhatsApp alert failed");
      } else if (!r.value.ok && !r.value.skipped) {
        log.warn(
          { threadId, to: numbers[i], error: formatWhatsAppSendError(r.value) },
          "support admin WhatsApp alert failed",
        );
      }
    });

    const recipients = await resolveSupportAdminEmails();
    if (recipients.length === 0) {
      log.warn({ threadId }, "support alert email skipped — no admin recipients resolved");
      return;
    }

    // allSettled, not all: one bad address must not skip the other admins.
    const results = await Promise.allSettled(
      recipients.map((to) =>
        sendSupportMessageAlertEmail({ to, doctorName, threadUrl, snippet }),
      ),
    );
    const failed = results.filter(
      (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok),
    ).length;
    if (failed > 0) {
      log.warn(
        { threadId, failed, total: recipients.length },
        "some support alert emails failed to send",
      );
    }
  } catch (error) {
    log.warn({ err: error, threadId }, "support alert email fan-out failed");
  }
}

/**
 * Email + WhatsApp the doctor that the admin team wrote in — throttled per
 * thread on `lastDoctorAlertAt`.
 *
 * Exact mirror of `alertAdminsOfSupportMessage`, so a conversation the ADMIN
 * starts reaches the doctor the same way a conversation the DOCTOR starts
 * reaches the admin team. The window is claimed with a conditional
 * `updateMany` (not read-then-write) so two concurrent admin POSTs can't
 * double-send, and it is cleared in `afterDoctorMessage` the moment the doctor
 * replies — an answered thread must alert immediately on the next admin
 * message rather than sitting out the rest of the window.
 *
 * One window covers BOTH channels: whichever request claims it sends the
 * WhatsApp and the email, so the doctor never gets one without the other.
 *
 * Never throws. Never blocks the caller's response — invoke as
 * `void alertDoctorOfSupportMessage(...)`.
 */
export async function alertDoctorOfSupportMessage(args: {
  threadId: string;
  doctorId: string;
  /** First name of the admin who wrote — all the doctor is ever shown. */
  adminName: string;
  snippet: string | null;
  log: FastifyBaseLogger;
}): Promise<void> {
  const { threadId, doctorId, adminName, snippet, log } = args;
  try {
    const now = new Date();
    const claimed = await prisma.supportThread.updateMany({
      where: {
        id: threadId,
        OR: [
          { lastDoctorAlertAt: null },
          { lastDoctorAlertAt: { lt: supportThrottleCutoff(now) } },
        ],
      },
      data: { lastDoctorAlertAt: now },
    });
    if (claimed.count === 0) {
      log.info(
        { threadId },
        "support doctor alert suppressed — inside throttle window (bell only)",
      );
      return;
    }

    const contact = await resolveDoctorContact(doctorId);
    if (!contact) {
      log.warn({ threadId, doctorId }, "support doctor alert skipped — doctor not found");
      return;
    }

    const threadUrl = supportThreadDoctorUrl();

    if (contact.whatsappNumber) {
      const greeting = formatDoctorGreetingName(contact);
      const waText = `Hello ${greeting}, ${adminName} from the Global Health support team sent you a message${snippet ? `:
"${snippet}"` : "."}

${threadUrl}`;
      const result = await sendWhatsAppText({
        to: contact.whatsappNumber,
        message: waText,
        hints: contact.whatsappHints,
      });
      if (!result.ok && !result.skipped) {
        log.warn(
          { threadId, doctorId, error: formatWhatsAppSendError(result) },
          "support doctor WhatsApp alert failed",
        );
      }
    } else {
      log.info(
        { threadId, doctorId },
        "support doctor WhatsApp alert skipped — no usable number",
      );
    }

    if (contact.loginEmail) {
      const result = await sendSupportReplyDoctorAlertEmail({
        to: contact.loginEmail,
        adminName,
        threadUrl,
        snippet,
      });
      if (!result.ok) {
        log.warn({ threadId, doctorId }, "support doctor alert email failed");
      }
    } else {
      log.warn(
        { threadId, doctorId },
        "support doctor alert email skipped — no login email",
      );
    }
  } catch (error) {
    log.warn({ err: error, threadId, doctorId }, "support doctor alert fan-out failed");
  }
}

/** Trim a message body (or filename) into an email/bell-safe one-liner. */
export function supportSnippet(input: {
  body?: string | null;
  fileName?: string | null;
}): string | null {
  const body = input.body?.trim();
  if (body) return body.length > 140 ? `${body.slice(0, 139)}…` : body;
  const file = input.fileName?.trim();
  return file ? `Sent a file: ${file}` : null;
}
