import type { FastifyRequest } from "fastify";
import { CartItemKind, OrderStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import {
  DoctorNotAssignedToServiceError,
  DoctorNotAvailableInCountryError,
  DoctorNotFoundError,
} from "./manual-booking.service.js";
import { releaseAppointmentSlot } from "../doctor-availability/doctor-availability.service.js";
import { generateOrderMeetLink, orderIsPaidForMeet } from "../admin-orders/generate-order-meet-link.service.js";
import { recomputePrePaymentDueAt } from "../automation/pre-payment-flow.service.js";
import { sendAppointmentUpdateNotifications } from "../automation/appointment-update-notifications.service.js";
import { recordAudit } from "../audit/audit.service.js";
import { getAppointmentById, type AdminAppointmentDetail } from "./appointments.service.js";
import { computeAppointmentUpdateDiff } from "./admin-update-appointment.diff.js";

export { computeAppointmentUpdateDiff, type AppointmentUpdateDiff } from "./admin-update-appointment.diff.js";

const CONSULTATION_KINDS: CartItemKind[] = [
  CartItemKind.GENERAL_CONSULTATION,
  CartItemKind.SPECIALIST_CONSULTATION,
];

export class AppointmentNotFoundError extends Error {
  constructor() {
    super("Appointment not found");
    this.name = "AppointmentNotFoundError";
  }
}

export class NoAppointmentChangesError extends Error {
  constructor() {
    super("No changes to apply");
    this.name = "NoAppointmentChangesError";
  }
}

export type AdminUpdateAppointmentInput = {
  appointmentId: string;
  scheduledAt?: Date | null;
  doctorId?: string | null;
  changeReason: string;
  adminUserId?: string | null;
  request?: FastifyRequest;
};

export type AdminUpdateAppointmentResult = {
  appointment: AdminAppointmentDetail;
  orderId: string | null;
  meetingUrl: string | null;
  notificationsSent: boolean;
};

async function validateDoctorForAppointment(
  doctorId: string,
  serviceId: string | null,
  countryCode: string,
): Promise<void> {
  if (!serviceId) {
    const doc = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: {
        active: true,
        country: { select: { code: true } },
        additionalCountries: {
          where: { country: { code: countryCode.toLowerCase(), isActive: true }, active: true },
          select: { id: true },
        },
      },
    });
    if (!doc) throw new DoctorNotFoundError();
    const inCountry =
      doc.country.code.toLowerCase() === countryCode.toLowerCase() ||
      doc.additionalCountries.length > 0;
    if (!doc.active || !inCountry) throw new DoctorNotAvailableInCountryError();
    return;
  }

  const service = await prisma.service.findFirst({
    where: {
      id: serviceId,
      isActive: true,
      country: { code: countryCode.toLowerCase(), isActive: true },
    },
    select: { id: true, countryId: true },
  });
  if (!service) {
    throw new DoctorNotAssignedToServiceError();
  }

  const doc = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: {
      active: true,
      countryId: true,
      additionalCountries: {
        where: { countryId: service.countryId, active: true },
        select: { id: true },
      },
      assignedServices: {
        where: { serviceId: service.id, isActive: true, status: "active" },
        select: { id: true },
      },
    },
  });
  if (!doc) throw new DoctorNotFoundError();

  const inCountry =
    doc.countryId === service.countryId || doc.additionalCountries.length > 0;
  if (!doc.active || !inCountry) throw new DoctorNotAvailableInCountryError();
  if (doc.assignedServices.length === 0) throw new DoctorNotAssignedToServiceError();
}

export async function adminUpdateAppointment(
  input: AdminUpdateAppointmentInput,
): Promise<AdminUpdateAppointmentResult> {
  const row = await prisma.appointment.findUnique({
    where: { id: input.appointmentId },
    select: {
      id: true,
      scheduledAt: true,
      doctorId: true,
      meetingUrl: true,
      consultationMode: true,
      serviceId: true,
      countryCode: true,
      timeSlotId: true,
    },
  });
  if (!row) throw new AppointmentNotFoundError();

  const diff = computeAppointmentUpdateDiff(row, input);
  if (!diff.hasChanges) throw new NoAppointmentChangesError();

  if (diff.nextDoctorId) {
    await validateDoctorForAppointment(
      diff.nextDoctorId,
      row.serviceId,
      row.countryCode,
    );
  }

  const orderItem = await prisma.orderItem.findFirst({
    where: {
      appointmentId: input.appointmentId,
      kind: { in: CONSULTATION_KINDS },
    },
    select: {
      id: true,
      orderId: true,
      order: {
        select: {
          id: true,
          paymentStatus: true,
          status: true,
          meetingUrl: true,
        },
      },
    },
  });
  const orderId = orderItem?.orderId ?? null;

  const beforeSnapshot = {
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    doctorId: row.doctorId,
    meetingUrl: row.meetingUrl,
  };

  if (diff.timeChanged && row.timeSlotId) {
    await releaseAppointmentSlot(input.appointmentId).catch(() => undefined);
  }

  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({
      where: { id: input.appointmentId },
      data: {
        ...(input.scheduledAt !== undefined ? { scheduledAt: input.scheduledAt } : {}),
        ...(input.doctorId !== undefined ? { doctorId: input.doctorId } : {}),
        updatedAt: new Date(),
      },
    });
    if (orderItem && input.doctorId !== undefined) {
      await tx.orderItem.update({
        where: { id: orderItem.id },
        data: { doctorId: input.doctorId },
      });
    }
  });

  // Move the payment deadline with the consultation. It is derived from the
  // consultation start at booking time, so leaving it behind lets an unpaid
  // order outlive the appointment it belongs to — the order then reads as
  // "still awaiting payment" while the slot comes and goes, and every
  // automation gated on "not cancelled yet" fires against a dead booking
  // (ORD-000382, 2026-08-21). No-ops on paid orders.
  if (orderId && diff.timeChanged) {
    await recomputePrePaymentDueAt(orderId, input.scheduledAt ?? null).catch(
      () => undefined,
    );
  }

  let meetingUrl: string | null = orderItem?.order.meetingUrl ?? row.meetingUrl;
  const shouldRegenerateMeet =
    Boolean(orderId) &&
    orderIsPaidForMeet({
      paymentStatus: orderItem!.order.paymentStatus,
      status: orderItem!.order.status as OrderStatus,
    }) &&
    row.consultationMode === "ONLINE" &&
    (diff.timeChanged || diff.doctorChanged);

  if (shouldRegenerateMeet && orderId) {
    const meetResult = await generateOrderMeetLink(orderId, {
      forceRegenerate: true,
      skipSideEffects: true,
    });
    if (meetResult.ok) {
      meetingUrl = meetResult.meetLink;
    }
  }

  const appointment = await getAppointmentById(input.appointmentId);
  if (!appointment) throw new AppointmentNotFoundError();

  let notificationsSent = false;
  if (orderId) {
    const notifyResult = await sendAppointmentUpdateNotifications({
      orderId,
      appointmentId: input.appointmentId,
      changeReason: input.changeReason,
      previousDoctorId: beforeSnapshot.doctorId,
      newDoctorId: diff.nextDoctorId,
      meetingUrl,
    }).catch(() => ({ sent: false }));
    notificationsSent = notifyResult.sent;
  }

  recordAudit({
    actorUserId: input.adminUserId ?? null,
    actorRole: "ADMIN",
    action: "APPOINTMENT_RESCHEDULED",
    entityType: "Appointment",
    entityId: input.appointmentId,
    metadata: {
      reason: input.changeReason.trim(),
      before: beforeSnapshot,
      after: {
        scheduledAt: appointment.scheduledAt,
        doctorId: diff.nextDoctorId,
        meetingUrl,
      },
      orderId,
    },
    request: input.request,
  }).catch(() => undefined);

  return {
    appointment,
    orderId,
    meetingUrl,
    notificationsSent,
  };
}
