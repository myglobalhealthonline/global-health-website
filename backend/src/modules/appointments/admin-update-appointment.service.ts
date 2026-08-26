import type { FastifyRequest } from "fastify";
import { CartItemKind } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import {
  DoctorNotAssignedToServiceError,
  DoctorNotAvailableInCountryError,
  DoctorNotFoundError,
} from "./manual-booking.service.js";
import {
  reclaimSlotForRescheduledAppointment,
  releaseAppointmentSlot,
} from "../doctor-availability/doctor-availability.service.js";
import { applyRescheduleSideEffects } from "./reschedule-side-effects.service.js";
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

  // Read the released slot's length before it goes, so the consultation keeps
  // its true duration when we re-claim a slot at the new time.
  const previousSlot =
    diff.timeChanged && row.timeSlotId
      ? await prisma.doctorTimeSlot.findUnique({
          where: { id: row.timeSlotId },
          select: { startAt: true, endAt: true },
        })
      : null;
  const previousSlotMinutes = previousSlot
    ? Math.round(
        (previousSlot.endAt.getTime() - previousSlot.startAt.getTime()) / 60_000,
      )
    : null;

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

  // The move above only wrote `scheduledAt` — the old slot is already
  // released, so without this the new time is backed by no DoctorTimeSlot and
  // the booking page keeps offering it to other patients. Best-effort: an
  // off-grid admin time simply stays slotless, as before.
  if (diff.timeChanged) {
    await reclaimSlotForRescheduledAppointment(
      input.appointmentId,
      diff.nextDoctorId,
      diff.nextScheduledAt,
      previousSlotMinutes,
    ).catch(() => null);
  }

  // Deadline move, reminder re-arm, Meet reissue and the patient/doctor
  // "appointment updated" notifications are shared with the doctor-portal and
  // patient self-service reschedule paths — see
  // applyRescheduleSideEffects for the ordering and the reasoning.
  const sideEffects = await applyRescheduleSideEffects({
    appointmentId: input.appointmentId,
    scheduledAt: diff.nextScheduledAt,
    timeChanged: diff.timeChanged,
    doctorChanged: diff.doctorChanged,
    changeReason: input.changeReason,
    previousDoctorId: beforeSnapshot.doctorId,
    newDoctorId: diff.nextDoctorId,
    fallbackMeetingUrl: orderItem?.order.meetingUrl ?? row.meetingUrl,
  });
  const meetingUrl = sideEffects.meetingUrl;
  const notificationsSent = sideEffects.notificationsSent;

  const appointment = await getAppointmentById(input.appointmentId);
  if (!appointment) throw new AppointmentNotFoundError();

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
