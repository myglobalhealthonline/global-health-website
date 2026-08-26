import { CartItemKind, OrderStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import {
  generateOrderMeetLink,
  orderIsPaidForMeet,
} from "../admin-orders/generate-order-meet-link.service.js";
import { recomputePrePaymentDueAt } from "../automation/pre-payment-flow.service.js";
import { rearmPostPaymentRemindersForReschedule } from "../automation/post-payment-flow.service.js";
import { sendAppointmentUpdateNotifications } from "../automation/appointment-update-notifications.service.js";

const CONSULTATION_KINDS: CartItemKind[] = [
  CartItemKind.GENERAL_CONSULTATION,
  CartItemKind.SPECIALIST_CONSULTATION,
];

export type RescheduleSideEffectsInput = {
  appointmentId: string;
  /** New consultation start. Omit to read it back off the appointment row. */
  scheduledAt?: Date | null;
  timeChanged: boolean;
  doctorChanged?: boolean;
  /** Shown to patient + doctor as "reason for change". "" hides the row. */
  changeReason: string;
  /**
   * Doctor before/after the change. Omit both on a time-only move (patient
   * self-service, doctor portal): they default to the appointment's current
   * doctor, which reads as "unchanged" and still notifies them of the new
   * time. Passing null for `newDoctorId` would instead read as "doctor
   * removed" and suppress the doctor-side notification entirely.
   */
  previousDoctorId?: string | null;
  newDoctorId?: string | null;
  /** Link to report when regeneration is skipped or fails. */
  fallbackMeetingUrl?: string | null;
};

export type RescheduleSideEffectsResult = {
  orderId: string | null;
  meetingUrl: string | null;
  meetRegenerated: boolean;
  notificationsSent: boolean;
};

/**
 * Everything that has to happen AROUND a consultation being moved, shared by
 * all three reschedule paths (admin order page, doctor portal, patient
 * self-service). Each of them used to carry its own subset, so the same move
 * produced different downstream state depending on who made it: the patient
 * self-service path only wrote an audit row — no new Meet link, no
 * notification, no deadline move — and the doctor path was missing the Meet
 * link and the reminder re-arm.
 *
 * In order:
 *   1. Move the pre-payment deadline onto the new start (no-op once paid).
 *   2. Re-arm the post-payment reminder ladder so the 1-hour/5-minute
 *      reminders fire against the NEW time.
 *   3. Regenerate the Google Meet link for paid ONLINE consultations. The old
 *      link belongs to a calendar event at the old time, so it has to be
 *      reissued. `generateOrderMeetLink` writes `Order.meetingUrl` AND every
 *      linked `Appointment.meetingUrl` in one transaction — that pair is what
 *      the admin order page, the doctor workspace, the patient account and
 *      every automation template read, so one call updates the link
 *      everywhere.
 *   4. Send the "appointment updated" notifications (patient email+WhatsApp,
 *      assigned doctor, admin alert) carrying the new time and new link.
 *
 * Every step is best-effort: a failure in one must not roll back the move
 * itself, which is already committed by the time we get here.
 */
export async function applyRescheduleSideEffects(
  input: RescheduleSideEffectsInput,
): Promise<RescheduleSideEffectsResult> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: input.appointmentId },
    select: {
      id: true,
      scheduledAt: true,
      consultationMode: true,
      meetingUrl: true,
      doctorId: true,
    },
  });
  if (!appointment) {
    return {
      orderId: null,
      meetingUrl: input.fallbackMeetingUrl ?? null,
      meetRegenerated: false,
      notificationsSent: false,
    };
  }

  const orderItem = await prisma.orderItem.findFirst({
    where: { appointmentId: input.appointmentId, kind: { in: CONSULTATION_KINDS } },
    select: {
      orderId: true,
      order: {
        select: { id: true, paymentStatus: true, status: true, meetingUrl: true },
      },
    },
  });

  let meetingUrl =
    input.fallbackMeetingUrl ??
    orderItem?.order.meetingUrl ??
    appointment.meetingUrl ??
    null;

  // No order behind this appointment (legacy/manual rows): nothing downstream
  // to move, and no recipient context to notify from.
  if (!orderItem?.orderId) {
    return {
      orderId: null,
      meetingUrl,
      meetRegenerated: false,
      notificationsSent: false,
    };
  }

  const orderId = orderItem.orderId;
  const scheduledAt = input.scheduledAt ?? appointment.scheduledAt ?? null;
  const previousDoctorId =
    input.previousDoctorId !== undefined
      ? input.previousDoctorId
      : appointment.doctorId;
  const newDoctorId =
    input.newDoctorId !== undefined ? input.newDoctorId : appointment.doctorId;
  const doctorChanged =
    input.doctorChanged ??
    (previousDoctorId !== newDoctorId &&
      (previousDoctorId !== null || newDoctorId !== null));

  if (input.timeChanged) {
    await recomputePrePaymentDueAt(orderId, scheduledAt).catch(() => undefined);
    await rearmPostPaymentRemindersForReschedule(orderId, scheduledAt).catch(
      () => undefined,
    );
  }

  let meetRegenerated = false;
  const shouldRegenerateMeet =
    (input.timeChanged || doctorChanged) &&
    appointment.consultationMode === "ONLINE" &&
    orderIsPaidForMeet({
      paymentStatus: orderItem.order.paymentStatus,
      status: orderItem.order.status as OrderStatus,
    });

  if (shouldRegenerateMeet) {
    const meetResult = await generateOrderMeetLink(orderId, {
      forceRegenerate: true,
      // The "appointment updated" notification below already carries the new
      // link; letting the meet service fire its own meeting-link flow would
      // send the patient a second, contradictory message.
      skipSideEffects: true,
    }).catch(() => null);
    if (meetResult?.ok) {
      meetingUrl = meetResult.meetLink;
      meetRegenerated = true;
    }
  }

  const notifyResult = await sendAppointmentUpdateNotifications({
    orderId,
    appointmentId: input.appointmentId,
    changeReason: input.changeReason,
    previousDoctorId,
    newDoctorId,
    meetingUrl,
  }).catch(() => ({ sent: false }));

  return {
    orderId,
    meetingUrl,
    meetRegenerated,
    notificationsSent: notifyResult.sent,
  };
}
