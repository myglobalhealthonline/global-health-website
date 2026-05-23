import { CartItemKind } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import {
  createMeetLinkForAppointment,
  isGoogleMeetConfigured,
} from "../../lib/google-meet/google-meet.service.js";

const CONSULTATION_KINDS: CartItemKind[] = [
  CartItemKind.GENERAL_CONSULTATION,
  CartItemKind.SPECIALIST_CONSULTATION,
];

export type GenerateOrderMeetLinkResult =
  | { ok: true; meetLink: string; serviceTitle: string }
  | { ok: false; code: "NOT_FOUND" | "NO_CONSULTATION" | "MISSING_SCHEDULE" | "NOT_CONFIGURED"; message: string };

export async function generateOrderMeetLink(orderId: string): Promise<GenerateOrderMeetLinkResult> {
  if (!isGoogleMeetConfigured()) {
    return {
      ok: false,
      code: "NOT_CONFIGURED",
      message:
        "Google Meet is not configured. Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REFRESH_TOKEN.",
    };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) {
    return { ok: false, code: "NOT_FOUND", message: "Order not found" };
  }

  const consultItem = order.items.find((item) => CONSULTATION_KINDS.includes(item.kind));
  if (!consultItem) {
    return {
      ok: false,
      code: "NO_CONSULTATION",
      message: "This order has no consultation items. Meet links apply to online consultations only.",
    };
  }

  let startAt: Date | null = null;
  let endAt: Date | null = null;
  let doctorName = "Doctor";
  let serviceTitle = consultItem.name;

  if (consultItem.appointmentId) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: consultItem.appointmentId },
      include: {
        timeSlot: true,
        doctor: { select: { fullName: true } },
        service: { select: { name: true } },
      },
    });
    if (appointment) {
      startAt = appointment.scheduledAt ?? appointment.timeSlot?.startAt ?? null;
      endAt = appointment.timeSlot?.endAt ?? null;
      if (appointment.doctor?.fullName) doctorName = appointment.doctor.fullName;
      if (appointment.service?.name) serviceTitle = appointment.service.name;
    }
  } else if (consultItem.timeSlotId) {
    const slot = await prisma.doctorTimeSlot.findUnique({
      where: { id: consultItem.timeSlotId },
      include: { doctor: { select: { fullName: true } } },
    });
    if (slot) {
      startAt = slot.startAt;
      endAt = slot.endAt;
      if (slot.doctor?.fullName) doctorName = slot.doctor.fullName;
    }
  }

  if (!startAt) {
    return {
      ok: false,
      code: "MISSING_SCHEDULE",
      message: "Could not determine the consultation start time for this order.",
    };
  }

  if (!endAt) {
    endAt = new Date(startAt.getTime() + 30 * 60 * 1000);
  }

  const eventTitle = `${serviceTitle} with ${doctorName}`;
  const meetLink = await createMeetLinkForAppointment({
    startTime: startAt,
    endTime: endAt,
    serviceTitle: eventTitle,
  });

  const appointmentIds = order.items
    .map((item) => item.appointmentId)
    .filter((id): id is string => Boolean(id));

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { meetingUrl: meetLink },
    });
    if (appointmentIds.length > 0) {
      await tx.appointment.updateMany({
        where: { id: { in: appointmentIds } },
        data: { meetingUrl: meetLink },
      });
    }
  });

  return { ok: true, meetLink, serviceTitle: eventTitle };
}
