import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { sendEmail } from "../../lib/email/send-email.js";
import { sendWhatsAppText } from "../../lib/whatsapp/wasender.js";
import { detectAutomationLanguage } from "../automation/pre-payment-messages.js";
import { resolvePatientProfileIdForAppointmentId } from "../patient-profile/appointment-patient-link.js";
import {
  identityEmailHtml,
  identityEmailSubject,
  identityEmailText,
  identityWhatsAppMessage,
} from "./identity-verification-messages.js";

/**
 * Asks a patient to complete identity verification.
 *
 * Runs in every market, so the language is resolved per patient the same way
 * the booking notifications do it — from the appointment's country, falling
 * back to the service name and then English.
 *
 * Addressed by PatientProfile id, never by an email address. It used to take
 * one, and re-derived everything from it: the profile by `findFirst` on the
 * address, and the appointment carrying the WhatsApp consent, phone, country
 * and language by the same address. That is safe only while the address has one
 * owner for all time. Anonymization releases it, so after patient A was
 * anonymized and patient B registered with the string A gave up, a doctor
 * requesting verification for A wrote the request onto A's retained record and
 * sent the email and the WhatsApp message to B — with B's name, B's phone, B's
 * consent and B's language, telling a stranger that their identity documents
 * were being asked for.
 *
 * So the caller supplies the identity it already established, and every piece
 * of contact, consent and locale here is read from that one patient.
 */

export type NotifyChannel = "email" | "whatsapp";

export type NotifyVerificationResult = {
  sent: NotifyChannel[];
  failed: NotifyChannel[];
  missingPhone: boolean;
  missingConsent: boolean;
  /** The patient has no reachable contact details at all — anonymized,
   *  tombstoned, or simply gone. Nothing was attempted, and nothing SHOULD be:
   *  the address their appointments still carry may belong to somebody else
   *  now. Distinct from a delivery failure, which lands in `failed`. */
  missingContact: boolean;
};

/** Anonymization parks a `deleted-<id>@removed.invalid` tombstone on the
 *  profile. It is not an address, it is the absence of one. */
function isTombstonedAddress(email: string): boolean {
  return email.trim().toLowerCase().endsWith("@removed.invalid");
}

function verificationUrl(): string {
  const base = (env.PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/account/profile?tab=verification`;
}

const APPOINTMENT_CONTEXT_SELECT = {
  whatsappConsent: true,
  phone: true,
  countryCode: true,
  consultationType: true,
  consultationLanguageCode: true,
} as const;

/**
 * Send the request. Never throws: a failed notification must not roll back the
 * request itself — the patient still sees the prompt in their portal, and the
 * doctor can re-send.
 */
export async function notifyPatientVerificationRequested(input: {
  /** The patient the request was written to. The ONLY identity used here. */
  patientProfileId: string;
  /** The appointment that established the relationship, if the caller has one.
   *  Used only after it is re-proved to belong to `patientProfileId` — an
   *  appointment merely carrying the patient's historical address proves
   *  nothing once that address has been released. */
  appointmentId?: string | null;
  doctorName?: string | null;
}): Promise<NotifyVerificationResult> {
  const sent: NotifyChannel[] = [];
  const failed: NotifyChannel[] = [];
  let missingPhone = false;
  let missingConsent = false;

  const profile = await prisma.patientProfile.findUnique({
    where: { id: input.patientProfileId },
    select: { fullName: true, phone: true, email: true, anonymizedAt: true },
  });
  // Anonymized or tombstoned: the personal data is gone by legal instruction
  // and the address has been released. Suppress delivery and say so, rather
  // than sending to whoever holds that address today.
  if (!profile || profile.anonymizedAt || isTombstonedAddress(profile.email)) {
    return {
      sent,
      failed,
      missingPhone: false,
      missingConsent: false,
      missingContact: true,
    };
  }

  // WhatsApp consent and the country that decides language both live on the
  // appointment, not the profile — mirror the lookup the other patient
  // notifications use rather than assuming either. The appointment has to be
  // THIS patient's, proven by the same conservative rules used everywhere else
  // (durable link, or a legacy row corroborated by account + address + no
  // booked-for-other order line); anything else is a different person's
  // consent and a different person's phone.
  let appt: {
    whatsappConsent: boolean;
    phone: string | null;
    countryCode: string;
    consultationType: string | null;
    consultationLanguageCode: string | null;
  } | null = null;
  if (
    input.appointmentId &&
    (await resolvePatientProfileIdForAppointmentId(input.appointmentId)) ===
      input.patientProfileId
  ) {
    appt = await prisma.appointment.findUnique({
      where: { id: input.appointmentId },
      select: APPOINTMENT_CONTEXT_SELECT,
    });
  }
  if (!appt) {
    appt = await prisma.appointment.findFirst({
      where: { patientProfileId: input.patientProfileId },
      orderBy: { createdAt: "desc" },
      select: APPOINTMENT_CONTEXT_SELECT,
    });
  }

  // An explicit consultation language beats the country guess: a Portuguese
  // speaker booking in Ireland should not be handed English.
  const explicit = appt?.consultationLanguageCode?.trim().toLowerCase();
  const lang =
    explicit && ["en", "pt", "es", "cs", "ro"].includes(explicit)
      ? (explicit as ReturnType<typeof detectAutomationLanguage>)
      : detectAutomationLanguage({
          countryCode: appt?.countryCode ?? null,
          serviceName: appt?.consultationType ?? null,
        });

  const ctx = {
    patientName: profile.fullName?.trim() || profile.email.split("@")[0],
    doctorName: input.doctorName?.trim() || null,
    verificationUrl: verificationUrl(),
  };

  try {
    const res = await sendEmail({
      to: profile.email,
      subject: identityEmailSubject(lang),
      text: identityEmailText(ctx, lang),
      html: identityEmailHtml(ctx, lang),
    });
    if (res.ok && res.mode !== "log") sent.push("email");
    else failed.push("email");
  } catch {
    failed.push("email");
  }

  const phone = profile.phone ?? appt?.phone ?? null;
  if (!phone) {
    missingPhone = true;
  } else if (!appt?.whatsappConsent) {
    missingConsent = true;
  } else {
    try {
      const wa = await sendWhatsAppText({
        to: phone,
        message: identityWhatsAppMessage(ctx, lang),
        hints: { orderCountryCode: appt.countryCode },
        patientConsent: appt.whatsappConsent,
      });
      if (wa.ok && !wa.skipped) sent.push("whatsapp");
      else failed.push("whatsapp");
    } catch {
      failed.push("whatsapp");
    }
  }

  return { sent, failed, missingPhone, missingConsent, missingContact: false };
}
