import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

/** Just enough of the client for `notifyDoctor` to run inside an interactive
 *  transaction — the shared `prisma` client satisfies it too. */
type NotifyClient = Pick<Prisma.TransactionClient, "user" | "notification">;

/**
 * Lightweight notification writers. Routes call these after a
 * trigger event (internal message posted, appointment assigned,
 * patient/doctor chat message sent) instead of poking the
 * Notification model directly. Centralising here makes it cheap to
 * swap the polling-based delivery for push (WebSockets, web-push)
 * later — only this module changes.
 *
 * All writes are best-effort: callers should `.catch()` and log.
 * A notification failure must NOT roll back the main mutation.
 */

export type NotificationPayload = {
  appointmentId?: string;
  snippet?: string;
  byUserName?: string;
  byRole?: "DOCTOR" | "ADMIN" | "PATIENT";
  /** Which chat thread this notification refers to. */
  channel?: "clinic" | "doctor";
  /** SupportThread id for SUPPORT_MESSAGE / SUPPORT_REPLY. These bells carry
   *  no appointmentId — the support thread is doctor-scoped, not per-visit. */
  threadId?: string;
  /** Pre-localized fields for patient-facing bells (title/body/href). */
  title?: string;
  body?: string;
  href?: string;
};

/**
 * Notify every admin (role=ADMIN, isActive=true). Used for internal
 * messages, clinical events, and now patient chat messages
 * (PATIENT_MESSAGE). Cap to 20 admins so unbounded fan-out can't happen.
 */
export async function notifyAdmins(
  type: NotificationType,
  payload: NotificationPayload,
): Promise<void> {
  // Notifies at most 20 active admins. This is a safety cap, not a business
  // rule — if the admin team ever grows beyond 20, raise this `take` (or
  // batch) so later admins still receive in-portal notifications.
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { id: true },
    take: 20,
  });
  if (admins.length === 0) return;
  await prisma.notification.createMany({
    data: admins.map((a) => ({
      recipientUserId: a.id,
      type,
      payload,
    })),
  });
}

/**
 * Notify the doctor user linked to `doctorId`. Used when an admin posts
 * an internal message, assigns the appointment, or a patient sends a
 * consultation chat message. No-op when the doctor profile has no login
 * user attached yet.
 *
 * Pass `client` (a Prisma transaction client) to write the bell in the SAME
 * commit as the caller's own state change — the 24h reminder dispatcher does
 * this so a crash can't leave a notification without its delivery marker.
 */
export async function notifyDoctor(
  doctorProfileId: string,
  type: NotificationType,
  payload: NotificationPayload,
  client: NotifyClient = prisma,
): Promise<void> {
  const link = await client.user.findFirst({
    where: { doctorId: doctorProfileId, isActive: true },
    select: { id: true },
  });
  if (!link) return;
  await client.notification.create({
    data: { recipientUserId: link.id, type, payload },
  });
}

/**
 * Notify a specific user (by user id) — used for patient-facing bells
 * (MESSAGE_REPLY when the clinic or a doctor replies). Payload should
 * carry the pre-localized { title, body, href } the patient bell renders.
 */
export async function notifyUser(
  recipientUserId: string,
  type: NotificationType,
  payload: NotificationPayload,
): Promise<void> {
  await prisma.notification.create({
    data: { recipientUserId, type, payload },
  });
}
