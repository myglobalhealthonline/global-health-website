import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { sendAppointmentReminderEmail } from "../../lib/email/templates.js";
import { formatDoctorForPatientNotification } from "../../lib/doctor-name.js";
import { formatNotificationDateTime } from "../notifications/notification-datetime.js";
import { notifyDoctor } from "../notifications/notify.service.js";
import { paidAppointmentWhere } from "./appointment-payment-gate.js";
import {
  OUTBOX_KIND_APPOINTMENT_REMINDER_DOCTOR,
  OUTBOX_KIND_APPOINTMENT_REMINDER_PATIENT,
} from "../outbox/outbox.js";

/**
 * 24h appointment reminders, split into an ENQUEUE pass (scan the window and
 * write durable outbox rows) and per-row DISPATCH functions (send, then stamp
 * the delivery marker).
 *
 * Why the split: the old cron route sent inline and stamped afterwards, so a
 * crash mid-run silently dropped every remaining reminder until the next hour
 * — and a reschedule between two runs could not re-arm anything, because the
 * marker was the only state. Now the outbox row IS the durable intent and the
 * marker means only "delivered".
 *
 * Idempotency keys carry the expected state, so a move mints a NEW row and the
 * stale one retires as a no-op:
 *   patient  `<kind>:<appointmentId>:<scheduledAt>`
 *   doctor   `<kind>:<appointmentId>:<scheduledAt>:<doctorId>`
 * The doctor key needs the doctor id as well: a doctor-only reassignment keeps
 * both the appointment id and the start time, so without it the new doctor's
 * row would collide with the one already sent to the old doctor.
 *
 * Payloads carry minimal internal identifiers only (appointment id, expected
 * start, expected doctor id) — no names, contact details, dates of birth,
 * addresses, medical detail or message bodies — and are never copied into
 * logs, `lastError` or ops alerts.
 */

const REMINDER_WINDOW_START_MS = 23 * 60 * 60 * 1000;
const REMINDER_WINDOW_END_MS = 25 * 60 * 60 * 1000;

/** Rows per keyset page. The window is 2h wide, so this is a cost knob, not a
 *  cap: the loop keeps paging until the whole window is drained. */
const ENQUEUE_PAGE_SIZE = 200;

const INELIGIBLE_STATUSES = ["CANCELLED", "COMPLETED"] as const;

export function patientReminderKey(appointmentId: string, scheduledAt: Date): string {
  return `${OUTBOX_KIND_APPOINTMENT_REMINDER_PATIENT}:${appointmentId}:${scheduledAt.toISOString()}`;
}

export function doctorReminderKey(
  appointmentId: string,
  scheduledAt: Date,
  doctorId: string,
): string {
  return `${OUTBOX_KIND_APPOINTMENT_REMINDER_DOCTOR}:${appointmentId}:${scheduledAt.toISOString()}:${doctorId}`;
}

export type EnqueueRemindersResult = {
  scanned: number;
  patientQueued: number;
  doctorQueued: number;
  created: number;
};

/**
 * Scan the whole 23-25h window and enqueue one outbox row per pending
 * reminder. Pages by stable keyset (`scheduledAt`, then `id` as the unique
 * tie-breaker) so appointments sharing a start time cannot starve the rows
 * behind them, and so the pass has no arbitrary ceiling.
 *
 * Safe to run as often as you like: the unique idempotency keys collapse every
 * repeat scan onto the same row for as long as the delivery marker is null.
 */
export async function enqueueDueAppointmentReminders(
  now: Date = new Date(),
): Promise<EnqueueRemindersResult> {
  const windowStart = new Date(now.getTime() + REMINDER_WINDOW_START_MS);
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_END_MS);

  let cursor: { scheduledAt: Date; id: string } | null = null;
  const result: EnqueueRemindersResult = {
    scanned: 0,
    patientQueued: 0,
    doctorQueued: 0,
    created: 0,
  };

  for (;;) {
    const keyset: Prisma.AppointmentWhereInput[] = cursor
      ? [
          {
            OR: [
              { scheduledAt: { gt: cursor.scheduledAt } },
              { scheduledAt: cursor.scheduledAt, id: { gt: cursor.id } },
            ],
          },
        ]
      : [];
    const page = await prisma.appointment.findMany({
      where: {
        scheduledAt: { gte: windowStart, lte: windowEnd },
        status: { notIn: [...INELIGIBLE_STATUSES] },
        // Never remind anyone about a consultation nobody paid for.
        AND: [paidAppointmentWhere, ...keyset],
      },
      select: {
        id: true,
        scheduledAt: true,
        doctorId: true,
        reminderSentAt: true,
        doctorReminderSentAt: true,
        meetingUrl: true,
        clinicId: true,
        locationAddress: true,
      },
      orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
      take: ENQUEUE_PAGE_SIZE,
    });
    if (page.length === 0) break;

    const rows: Prisma.OutboxCreateManyInput[] = [];
    for (const a of page) {
      if (!a.scheduledAt) continue;
      result.scanned++;
      // Patient reminder is due only when we can actually tell them how to
      // attend — a meeting link (ONLINE) or a clinic / address (IN_PERSON).
      const attendable =
        a.meetingUrl !== null || a.clinicId !== null || a.locationAddress !== null;
      if (a.reminderSentAt === null && attendable) {
        rows.push({
          kind: OUTBOX_KIND_APPOINTMENT_REMINDER_PATIENT,
          idempotencyKey: patientReminderKey(a.id, a.scheduledAt),
          payload: {
            appointmentId: a.id,
            expectedScheduledAt: a.scheduledAt.toISOString(),
          },
        });
        result.patientQueued++;
      }
      // Doctor reminder is independent: it fires for IN_PERSON bookings with
      // no meeting link, and whether or not the patient email went out.
      if (a.doctorId !== null && a.doctorReminderSentAt === null) {
        rows.push({
          kind: OUTBOX_KIND_APPOINTMENT_REMINDER_DOCTOR,
          idempotencyKey: doctorReminderKey(a.id, a.scheduledAt, a.doctorId),
          payload: {
            appointmentId: a.id,
            expectedScheduledAt: a.scheduledAt.toISOString(),
            expectedDoctorId: a.doctorId,
          },
        });
        result.doctorQueued++;
      }
    }
    if (rows.length > 0) {
      const created = await prisma.outbox.createMany({ data: rows, skipDuplicates: true });
      result.created += created.count;
    }

    const last = page[page.length - 1];
    if (!last?.scheduledAt) break;
    cursor = { scheduledAt: last.scheduledAt, id: last.id };
    if (page.length < ENQUEUE_PAGE_SIZE) break;
  }

  return result;
}

// ── Dispatch ────────────────────────────────────────────────────────────────

function readId(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= 64 ? value : null;
}

/**
 * Patient reminder email. Every guard failure is a successful NO-OP, not an
 * error: a stale row (appointment moved, cancelled, refunded, already
 * delivered) must retire quietly instead of retrying eight times.
 *
 * At-least-once by construction: SMTP/SendGrid gives us no provider-side
 * idempotency key, so a crash between "email accepted" and the marker stamp
 * re-sends on the next drain. That residual duplicate window is accepted; the
 * alternative (stamp first) silently loses a reminder instead.
 */
export async function dispatchPatientAppointmentReminder(payload: unknown): Promise<void> {
  const p = payload as { appointmentId?: unknown; expectedScheduledAt?: unknown } | null;
  const appointmentId = readId(p?.appointmentId);
  const expectedScheduledAt = readId(p?.expectedScheduledAt);
  if (!appointmentId || !expectedScheduledAt) {
    throw new Error(`${OUTBOX_KIND_APPOINTMENT_REMINDER_PATIENT}: invalid payload`);
  }

  const a = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      status: { notIn: [...INELIGIBLE_STATUSES] },
      AND: [paidAppointmentWhere],
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      consultationType: true,
      scheduledAt: true,
      reminderSentAt: true,
      meetingUrl: true,
      consultationMode: true,
      locationAddress: true,
      clinic: { select: { name: true, city: true } },
      doctor: { select: { fullName: true } },
    },
  });
  if (!a || !a.scheduledAt) return;
  if (a.reminderSentAt !== null) return;
  if (a.scheduledAt.toISOString() !== expectedScheduledAt) return;

  const isInPerson = a.consultationMode === "IN_PERSON";
  const where = a.clinic
    ? [a.clinic.name, a.clinic.city].filter(Boolean).join(", ")
    : a.locationAddress ?? null;
  if (isInPerson && !where) return;
  if (!isInPerson && !a.meetingUrl) return;

  const sent = await sendAppointmentReminderEmail({
    to: a.email,
    fullName: a.fullName,
    consultationType: a.consultationType,
    scheduledAt: a.scheduledAt,
    meetingUrl: isInPerson ? null : a.meetingUrl,
    where: isInPerson ? where : null,
    doctorName: a.doctor ? formatDoctorForPatientNotification(a.doctor.fullName) : null,
  });
  if (!sent.ok) {
    // `sendEmail` reports a rejected/failed delivery as `{ ok: false }` rather
    // than throwing, so stamping unconditionally would mark a reminder nobody
    // received as delivered and never retry it. Throw so the outbox's backoff
    // engages — and throw a MESSAGE OF OUR OWN: the provider's text embeds the
    // recipient address, and this string is persisted to `Outbox.lastError`
    // and forwarded to ops alerts.
    throw new Error(`${OUTBOX_KIND_APPOINTMENT_REMINDER_PATIENT}: email delivery failed`);
  }

  await prisma.appointment.updateMany({
    where: { id: a.id, reminderSentAt: null },
    data: { reminderSentAt: new Date() },
  });
}

/**
 * Doctor in-portal reminder. Same no-op-on-stale contract as the patient path,
 * plus the reassignment guard: a row minted for the OLD doctor carries that
 * doctor's id, so after a reassignment it can never notify them.
 *
 * The notification write and the marker stamp share one transaction, so a
 * crash between them cannot leave a duplicate bell in the doctor's portal.
 */
export async function dispatchDoctorAppointmentReminder(payload: unknown): Promise<void> {
  const p = payload as
    | { appointmentId?: unknown; expectedScheduledAt?: unknown; expectedDoctorId?: unknown }
    | null;
  const appointmentId = readId(p?.appointmentId);
  const expectedScheduledAt = readId(p?.expectedScheduledAt);
  const expectedDoctorId = readId(p?.expectedDoctorId);
  if (!appointmentId || !expectedScheduledAt || !expectedDoctorId) {
    throw new Error(`${OUTBOX_KIND_APPOINTMENT_REMINDER_DOCTOR}: invalid payload`);
  }

  const a = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      status: { notIn: [...INELIGIBLE_STATUSES] },
      AND: [paidAppointmentWhere],
    },
    select: {
      id: true,
      fullName: true,
      doctorId: true,
      doctorReminderSentAt: true,
      scheduledAt: true,
      meetingUrl: true,
      countryCode: true,
      // Clinic zone for the snippet's wall clock. The booked SERVICE's market
      // wins over the doctor's own country — a doctor rostered in several
      // markets reads each booking on the clock of the country it was booked in.
      service: {
        select: { country: { select: { bookingSetting: { select: { timezone: true } } } } },
      },
      doctor: {
        select: { country: { select: { bookingSetting: { select: { timezone: true } } } } },
      },
    },
  });
  if (!a || !a.scheduledAt || !a.doctorId) return;
  if (a.doctorReminderSentAt !== null) return;
  if (a.scheduledAt.toISOString() !== expectedScheduledAt) return;
  // Reassigned since this row was minted — the old doctor must never be told.
  if (a.doctorId !== expectedDoctorId) return;

  let staffTz = a.service?.country?.bookingSetting?.timezone ?? undefined;
  if (!staffTz && a.countryCode) {
    // Free-text bookings carry a countryCode but no Service row. Country codes
    // are stored lowercase.
    const country = await prisma.country.findFirst({
      where: { code: a.countryCode.toLowerCase() },
      select: { bookingSetting: { select: { timezone: true } } },
    });
    staffTz = country?.bookingSetting?.timezone ?? undefined;
  }
  staffTz = staffTz ?? a.doctor?.country?.bookingSetting?.timezone ?? undefined;

  const doctorId = a.doctorId;
  const snippet = `${a.fullName} · ${formatNotificationDateTime(a.scheduledAt, staffTz)}${
    a.meetingUrl ? "" : " (missing meeting link)"
  }`;
  await prisma.$transaction(async (tx) => {
    await notifyDoctor(doctorId, "APPOINTMENT_REMINDER", { appointmentId: a.id, snippet }, tx);
    await tx.appointment.updateMany({
      where: { id: a.id, doctorReminderSentAt: null },
      data: { doctorReminderSentAt: new Date() },
    });
  });
}
