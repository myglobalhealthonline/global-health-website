import type { FastifyBaseLogger } from "fastify";
import type { NotificationType } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { absoluteSiteUrl } from "../../lib/email/send-email.js";
import { sendSupportMessageAlertEmail } from "../../lib/email/templates.js";
import { adminNotifyEmails } from "../automation/admin-booking-alert.service.js";
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
    const windowMs = env.SUPPORT_ALERT_THROTTLE_MINUTES * 60 * 1000;
    const now = new Date();
    const cutoff = new Date(now.getTime() - windowMs);

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

    const recipients = await resolveSupportAdminEmails();
    if (recipients.length === 0) {
      log.warn({ threadId }, "support alert email skipped — no admin recipients resolved");
      return;
    }

    const threadUrl = supportThreadAdminUrl(threadId);
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
