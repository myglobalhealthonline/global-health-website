import { prisma } from "../../db/prisma.js";
import {
  createCalendarEventForAppointment,
  deleteCalendarEventForAppointment,
  isGoogleMeetConfigured,
} from "../../lib/google-meet/google-meet.service.js";
import { resolveDoctorContact } from "../../lib/whatsapp/resolve-doctor-contact.js";
import { sendWhatsAppText } from "../../lib/whatsapp/wasender.js";
import { notifyDoctor } from "../notifications/notify.service.js";
import {
  corporateBookingCancelledText,
  corporateBookingText,
  corporateDoctorBookingText,
  corporateDoctorCancelledText,
  sendCorporateBookingCancelledEmail,
  sendCorporateBookingConfirmationEmail,
  sendCorporateDoctorBookingEmail,
  sendCorporateDoctorCancelledEmail,
} from "./corporate-emails.js";
import { resolveDoctorTimeZone } from "../doctor-availability/doctor-availability.service.js";
import { corporateBookPath } from "./corporate-request.service.js";

/**
 * Everything a corporate consultation needs at booking time: a Google Meet
 * link, the member's confirmation, and the assigned doctor's heads-up.
 *
 * Catalogue bookings get all three from the post-payment automation, which is
 * keyed on `Order` end to end (`loadPostPaymentContext(orderId)`,
 * `Order.postPaymentStage`, `AutomationRun.orderId`, `generateOrderMeetLink`).
 * A corporate consultation mints no Order on purpose, so it can never enter
 * that pipeline — hence this dedicated path rather than a synthetic order,
 * which would drag the booking straight back into commission, payout and
 * invoicing.
 *
 * Fire-and-forget at the call site: none of this may fail a booking that has
 * already claimed a real slot. Each step is independently guarded, so a Meet
 * outage still sends the confirmations and a mail outage still notifies the
 * doctor.
 */
export async function notifyCorporateBookingCreated(
  appointmentId: string,
  log?: NotifyLog,
): Promise<void> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      countryCode: true,
      consultationType: true,
      scheduledAt: true,
      meetingUrl: true,
      whatsappConsent: true,
      corporateServiceId: true,
      doctorId: true,
      corporateService: { select: { durationMinutes: true } },
    },
  });
  // Not a corporate booking, or minted without a slot — nothing to confirm.
  if (!appointment?.corporateService || !appointment.scheduledAt) return;

  const doctorContact = await resolveDoctorContact(appointment.doctorId);
  const doctorName = doctorContact?.fullName ?? null;

  const meetingUrl =
    appointment.meetingUrl?.trim() ||
    (await provisionMeetLink({
      appointmentId: appointment.id,
      startAt: appointment.scheduledAt,
      durationMinutes: appointment.corporateService.durationMinutes,
      title: appointment.consultationType,
      // Doctor only — NEVER the patient. Google mails every attendee its own
      // raw calendar invite (`?sendUpdates=all`), which reaches the member as
      // "Invitation from an unknown sender" with a Report spam button, and
      // puts the doctor's personal address in the patient's Who list and the
      // patient's address in the subject line. The member's join link belongs
      // in our own branded confirmation below. Mirrors the paid flow, which
      // passes `uniqueEmails(doctorEmail)` for the same reason.
      attendeeEmails: doctorContact?.loginEmail ? [doctorContact.loginEmail] : [],
    }));

  // The clinic's zone, not the server's: this runs in UTC in production, and a
  // confirmation stating the wrong hour is worse than none.
  const timeZone = appointment.doctorId
    ? await resolveDoctorTimeZone(appointment.doctorId)
    : "UTC";
  const when = formatWhen(appointment.scheduledAt, timeZone);

  const firstName = appointment.fullName.trim().split(/\s+/)[0] || appointment.fullName;
  const patientCopy = {
    firstName,
    consultationName: appointment.consultationType,
    doctorName,
    when,
    meetingUrl,
  };

  await settle(
    sendCorporateBookingConfirmationEmail({ to: appointment.email, ...patientCopy }),
    "patient email",
    log,
  );

  if (appointment.phone) {
    // `patientConsent` fails CLOSED — an unconsented or unknown value skips the
    // send rather than defaulting to it (PRIV-001).
    await settle(
      sendWhatsAppText({
        to: appointment.phone,
        message: corporateBookingText(patientCopy),
        hints: { orderCountryCode: appointment.countryCode },
        patientConsent: appointment.whatsappConsent,
      }),
      "patient whatsapp",
      log,
    );
  }

  if (!appointment.doctorId) return;

  const doctorCopy = {
    doctorName: doctorName ?? "there",
    patientName: appointment.fullName,
    consultationName: appointment.consultationType,
    when,
    meetingUrl,
  };

  // Portal bell — same type and shape the paid flow posts, so the doctor's
  // notification list reads identically for a corporate booking.
  await settle(
    notifyDoctor(appointment.doctorId, "APPOINTMENT_ASSIGNED", {
      snippet: `${appointment.fullName} · ${appointment.consultationType} · ${when} · corporate`,
    }),
    "doctor portal notification",
    log,
  );

  if (doctorContact?.loginEmail) {
    await settle(
      sendCorporateDoctorBookingEmail({ to: doctorContact.loginEmail, ...doctorCopy }),
      "doctor email",
      log,
    );
  }

  if (doctorContact?.whatsappNumber) {
    // Staff-facing, so no `patientConsent` gate — same posture as the doctor
    // sends in the post-payment flow.
    await settle(
      sendWhatsAppText({
        to: doctorContact.whatsappNumber,
        message: corporateDoctorBookingText(doctorCopy),
        hints: doctorContact.whatsappHints,
      }),
      "doctor whatsapp",
      log,
    );
  }
}

/**
 * The member and the doctor are told when a corporate consultation is
 * cancelled — from the patient's own "Cancel" button, from an admin status
 * change, or from the doctor portal, all three of which funnel through
 * `onCorporateAppointmentStatusChanged`.
 *
 * Nothing in the product emailed anyone on cancellation:
 * `cancelAppointmentForPatient` writes an audit row and stops, and the admin
 * status route only rings the doctor's bell. The catalogue's cancellation mail
 * is the non-payment / credit-note pair, which is order-keyed and so unreachable
 * for a free booking. Same fire-and-forget contract as the confirmation.
 */
export async function notifyCorporateBookingCancelled(
  appointmentId: string,
  log?: NotifyLog,
): Promise<void> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      email: true,
      fullName: true,
      phone: true,
      countryCode: true,
      consultationType: true,
      scheduledAt: true,
      whatsappConsent: true,
      corporateServiceId: true,
      doctorId: true,
      calendarEventId: true,
    },
  });
  if (!appointment?.corporateServiceId || !appointment.scheduledAt) return;

  // Free the doctor's calendar before anyone is told, so the "slot is back"
  // message is already true when it lands. Only events we created carry an id;
  // an admin-pasted link has none and is left alone.
  if (appointment.calendarEventId) {
    await settle(
      deleteCalendarEventForAppointment(appointment.calendarEventId).then(() =>
        prisma.appointment.update({
          where: { id: appointmentId },
          data: { calendarEventId: null },
        }),
      ),
      "calendar event removal",
      log,
    );
  }

  const doctorContact = await resolveDoctorContact(appointment.doctorId);
  const timeZone = appointment.doctorId
    ? await resolveDoctorTimeZone(appointment.doctorId)
    : "UTC";
  const when = formatWhen(appointment.scheduledAt, timeZone);
  const firstName = appointment.fullName.trim().split(/\s+/)[0] || appointment.fullName;
  const rebookPath = corporateBookPath(appointment.corporateServiceId);

  await settle(
    sendCorporateBookingCancelledEmail({
      to: appointment.email,
      firstName,
      consultationName: appointment.consultationType,
      when,
      rebookPath,
    }),
    "patient cancellation email",
    log,
  );

  if (appointment.phone) {
    await settle(
      sendWhatsAppText({
        to: appointment.phone,
        message: corporateBookingCancelledText({
          firstName,
          consultationName: appointment.consultationType,
          when,
          rebookPath,
        }),
        hints: { orderCountryCode: appointment.countryCode },
        patientConsent: appointment.whatsappConsent,
      }),
      "patient cancellation whatsapp",
      log,
    );
  }

  if (!appointment.doctorId) return;
  const doctorCopy = {
    doctorName: doctorContact?.fullName ?? "there",
    patientName: appointment.fullName,
    consultationName: appointment.consultationType,
    when,
  };

  // The patient self-cancel path rings no bell at all today, so this is the
  // only signal the assigned doctor gets that their slot came back.
  await settle(
    notifyDoctor(appointment.doctorId, "APPOINTMENT_STATUS_CHANGED", {
      snippet: `${appointment.fullName} · ${appointment.consultationType} · ${when} · cancelled`,
    }),
    "doctor cancellation notification",
    log,
  );

  if (doctorContact?.loginEmail) {
    await settle(
      sendCorporateDoctorCancelledEmail({ to: doctorContact.loginEmail, ...doctorCopy }),
      "doctor cancellation email",
      log,
    );
  }

  if (doctorContact?.whatsappNumber) {
    await settle(
      sendWhatsAppText({
        to: doctorContact.whatsappNumber,
        message: corporateDoctorCancelledText(doctorCopy),
        hints: doctorContact.whatsappHints,
      }),
      "doctor cancellation whatsapp",
      log,
    );
  }
}

/** Clinic-zone wall clock. Shared so a confirmation and its cancellation can
 *  never disagree about what time the consultation was. */
function formatWhen(at: Date, timeZone: string): string {
  return at.toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  });
}

/** Just the sliver of the Fastify logger this module needs, so a caller that
 *  has a request-scoped logger gets these failures into the structured log
 *  instead of a bare stdout line nobody greps. */
export type NotifyLog = { warn: (obj: Record<string, unknown>, msg: string) => void };

/** One failing channel must not take the others down with it. */
async function settle(promise: Promise<unknown>, label: string, log?: NotifyLog): Promise<void> {
  try {
    await promise;
  } catch (error) {
    if (log) log.warn({ err: error, channel: label }, "corporate notification failed");
    // No request-scoped logger on the cancellation path (it runs from a status
    // hook, not a route), so keep the module's existing console fallback.
    else console.error(`[corporate] notification — ${label} failed:`, error);
  }
}

/**
 * Mint the consultation's Meet link and persist it, mirroring what
 * `generateOrderMeetLink` does for a paid order. Returns null (never throws)
 * when Meet is unconfigured or the call fails — the confirmations then say the
 * link follows rather than promising one that does not exist.
 */
async function provisionMeetLink(input: {
  appointmentId: string;
  startAt: Date;
  durationMinutes: number;
  title: string;
  attendeeEmails: string[];
}): Promise<string | null> {
  if (!isGoogleMeetConfigured()) return null;
  try {
    const { meetLink, eventId } = await createCalendarEventForAppointment({
      startTime: input.startAt,
      endTime: new Date(input.startAt.getTime() + input.durationMinutes * 60_000),
      serviceTitle: input.title,
      attendeeEmails: input.attendeeEmails.filter(Boolean),
    });
    // Guarded update: an admin who set a link by hand in the meantime wins.
    const claimed = await prisma.appointment.updateMany({
      where: { id: input.appointmentId, meetingUrl: null },
      data: { meetingUrl: meetLink, calendarEventId: eventId },
    });
    if (claimed.count === 1) return meetLink;
    // Someone got there first — read back only on that rare branch, and use
    // theirs, since it is the one the appointment now carries.
    const saved = await prisma.appointment.findUnique({
      where: { id: input.appointmentId },
      select: { meetingUrl: true },
    });
    return saved?.meetingUrl ?? meetLink;
  } catch (error) {
    console.error("[corporate] Meet link provisioning failed:", error);
    return null;
  }
}
