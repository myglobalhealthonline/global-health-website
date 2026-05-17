import { prisma } from "../../db/prisma.js";

/**
 * Lightweight notification writers. Routes call these after a
 * trigger event (internal message posted, appointment assigned)
 * instead of poking the Notification model directly. Centralising
 * here makes it cheap to swap the polling-based delivery for
 * push (WebSockets, web-push) later — only this module changes.
 *
 * All writes are best-effort: callers should `.catch()` and log.
 * A notification failure must NOT roll back the main mutation.
 */

export type NotificationPayload = {
  appointmentId?: string;
  snippet?: string;
  byUserName?: string;
  byRole?: "DOCTOR" | "ADMIN";
};

/**
 * Notify every admin (role=ADMIN, isActive=true). Used when a doctor
 * posts an internal message — admin team-inbox style. Cap to 20 admins
 * so unbounded fan-out can't happen.
 */
export async function notifyAdmins(
  type:
    | "APPOINTMENT_ASSIGNED"
    | "INTERNAL_MESSAGE"
    | "CONSULT_SIGNED"
    | "EXAM_LOGGED"
    | "FORM_SUBMITTED",
  payload: NotificationPayload,
): Promise<void> {
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
 * an internal message or assigns the appointment. No-op when the
 * doctor profile has no login user attached yet.
 */
export async function notifyDoctor(
  doctorProfileId: string,
  type:
    | "APPOINTMENT_ASSIGNED"
    | "INTERNAL_MESSAGE"
    | "CONSULT_SIGNED"
    | "EXAM_LOGGED"
    | "FORM_SUBMITTED",
  payload: NotificationPayload,
): Promise<void> {
  const link = await prisma.user.findFirst({
    where: { doctorId: doctorProfileId, isActive: true },
    select: { id: true },
  });
  if (!link) return;
  await prisma.notification.create({
    data: { recipientUserId: link.id, type, payload },
  });
}
