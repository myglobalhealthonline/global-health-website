import { CartItemKind, OrderStatus } from "@prisma/client";
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
  | { ok: true; meetLink: string; serviceTitle: string; skipped?: boolean }
  | {
      ok: false;
      code:
        | "NOT_FOUND"
        | "NO_CONSULTATION"
        | "MISSING_SCHEDULE"
        | "NOT_CONFIGURED"
        | "ALREADY_EXISTS";
      message: string;
    };

type ProvisionOptions = {
  /** When true, skip if the order already has a meetingUrl. Used on payment webhook. */
  skipIfExists?: boolean;
};

export function orderHasConsultationItem(items: { kind: CartItemKind }[]): boolean {
  return items.some((item) => CONSULTATION_KINDS.includes(item.kind));
}

export function orderIsPaidForMeet(order: {
  status: OrderStatus;
  paymentStatus: string;
}): boolean {
  return order.paymentStatus === "PAID" || order.status === OrderStatus.PAID;
}

export function orderNeedsAutoMeetLink(order: {
  meetingUrl: string | null;
  status: OrderStatus;
  paymentStatus: string;
  items: { kind: CartItemKind }[];
}): boolean {
  return (
    !order.meetingUrl?.trim() &&
    orderIsPaidForMeet(order) &&
    orderHasConsultationItem(order.items)
  );
}

/** Creates Meet link + calendar event when missing on a paid consultation order. */
export async function ensurePaidOrderMeetLink(orderId: string): Promise<string | null> {
  const result = await generateOrderMeetLink(orderId, { skipIfExists: true });
  return result.ok ? result.meetLink : null;
}

async function resolveDoctorLoginEmail(doctorId: string | null | undefined): Promise<string | null> {
  if (!doctorId) return null;
  const user = await prisma.user.findUnique({
    where: { doctorId },
    select: { email: true, isActive: true },
  });
  if (!user?.email?.trim()) return null;
  return user.email.trim().toLowerCase();
}

function uniqueEmails(...emails: Array<string | null | undefined>): string[] {
  return [...new Set(
    emails
      .map((email) => email?.trim().toLowerCase())
      .filter((email): email is string => Boolean(email && email.includes("@"))),
  )];
}

export async function generateOrderMeetLink(
  orderId: string,
  options: ProvisionOptions = {},
): Promise<GenerateOrderMeetLinkResult> {
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

  if (options.skipIfExists && order.meetingUrl?.trim()) {
    return {
      ok: true,
      meetLink: order.meetingUrl.trim(),
      serviceTitle: "Existing consultation",
      skipped: true,
    };
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
  let patientEmail = consultItem.patientEmail?.trim() || order.email.trim();
  let doctorId = consultItem.doctorId;
  let doctorEmail: string | null = null;

  if (consultItem.appointmentId) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: consultItem.appointmentId },
      include: {
        timeSlot: true,
        doctor: {
          select: {
            fullName: true,
            loginUser: { select: { email: true } },
          },
        },
        service: { select: { name: true } },
      },
    });
    if (appointment) {
      startAt = appointment.scheduledAt ?? appointment.timeSlot?.startAt ?? null;
      endAt = appointment.timeSlot?.endAt ?? null;
      if (appointment.doctor?.fullName) doctorName = appointment.doctor.fullName;
      if (appointment.service?.name) serviceTitle = appointment.service.name;
      patientEmail =
        consultItem.patientEmail?.trim() ||
        appointment.email?.trim() ||
        order.email.trim();
      doctorId = appointment.doctorId ?? doctorId;
      doctorEmail = appointment.doctor?.loginUser?.email?.trim().toLowerCase() ?? null;
    }
  } else if (consultItem.timeSlotId) {
    const slot = await prisma.doctorTimeSlot.findUnique({
      where: { id: consultItem.timeSlotId },
      include: {
        doctor: {
          select: {
            fullName: true,
            loginUser: { select: { email: true } },
          },
        },
      },
    });
    if (slot) {
      startAt = slot.startAt;
      endAt = slot.endAt;
      if (slot.doctor?.fullName) doctorName = slot.doctor.fullName;
      doctorId = slot.doctorId;
      doctorEmail = slot.doctor?.loginUser?.email?.trim().toLowerCase() ?? null;
    }
  }

  if (!doctorEmail) {
    doctorEmail = await resolveDoctorLoginEmail(doctorId);
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

  const attendeeEmails = uniqueEmails(patientEmail, doctorEmail);

  const eventTitle = `${serviceTitle} with ${doctorName}`;
  const meetLink = await createMeetLinkForAppointment({
    startTime: startAt,
    endTime: endAt,
    serviceTitle: eventTitle,
    attendeeEmails,
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

/** Best-effort Meet + Calendar provisioning when an order is paid. */
export async function autoProvisionOrderMeetOnPaid(
  orderId: string,
  log?: { info: (obj: unknown, msg?: string) => void; warn: (obj: unknown, msg?: string) => void },
): Promise<void> {
  if (!isGoogleMeetConfigured()) {
    log?.info({ orderId }, "Google Meet not configured — skipping auto calendar event");
    return;
  }

  try {
    const result = await generateOrderMeetLink(orderId, { skipIfExists: true });
    if (!result.ok) {
      if (result.code === "NO_CONSULTATION") return;
      log?.warn({ orderId, code: result.code, message: result.message }, "Auto Meet provisioning skipped");
      return;
    }
    if (result.skipped) {
      log?.info({ orderId, meetLink: result.meetLink }, "Order already has Meet link — calendar unchanged");
      return;
    }
    log?.info(
      { orderId, meetLink: result.meetLink, serviceTitle: result.serviceTitle },
      "Created Google Calendar event with Meet link for doctor and patient",
    );
  } catch (err) {
    log?.warn({ err, orderId }, "Auto Meet + calendar provisioning failed");
  }
}
