import type { LocaleCode } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { sendPatientUploadLinkEmail } from "../../lib/email/templates.js";
import { sendWhatsAppText } from "../../lib/whatsapp/wasender.js";
import {
  resolveNotificationLang,
  type NotificationLang,
} from "../automation/notification-language.js";
import { uploadLinkWhatsAppGeneral } from "./upload-link-messages.js";
import {
  buildPatientUploadUrl,
  createPatientUploadToken,
} from "./patient-upload-link.service.js";

/**
 * General (not prescription-scoped) patient upload link for one appointment.
 *
 * Distinct from `sendGeneratedDocumentUploadLink`, which binds the token to a
 * single EXAMS_PRESCRIPTION so the returned file is tagged with that
 * prescription. This one mints a plain appointment-scoped token: whatever the
 * patient uploads lands in the same `AppointmentDocument` table the doctor's
 * Documents tab already reads, so patient uploads and doctor uploads show up
 * side by side with no extra plumbing.
 *
 * Used by both the doctor workspace and the admin appointment page — the
 * only difference is the caller's authorization scope, which is resolved
 * before this runs (`doctorIdScope`).
 */

export type UploadLinkChannel = "email" | "whatsapp";

export const UPLOAD_LINK_CHANNELS: readonly UploadLinkChannel[] = ["email", "whatsapp"];

export function parseUploadLinkChannels(raw: unknown): UploadLinkChannel[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<UploadLinkChannel>();
  for (const value of raw) {
    if (value === "email" || value === "whatsapp") seen.add(value);
  }
  return [...seen];
}

export type SendAppointmentUploadLinkResult =
  | {
      ok: true;
      link: string;
      expiresAt: Date;
      /** Channels that actually delivered. */
      sent: UploadLinkChannel[];
      /** Channels that were requested but failed / were unavailable. */
      failed: UploadLinkChannel[];
      /** True when WhatsApp was requested but the appointment has no phone. */
      missingPhone: boolean;
      /** Language the message was actually written in — the caller's override
       *  when one was passed, otherwise the booking's own language. */
      lang: NotificationLang;
    }
  | { ok: false; status: 400 | 404; message: string };

export async function sendAppointmentUploadLink(opts: {
  appointmentId: string;
  /** Non-null for DOCTOR callers — restricts the lookup to their own rows.
   *  Null for ADMIN callers, who may act on any appointment. */
  doctorIdScope: string | null;
  channels: UploadLinkChannel[];
  /** Admin/doctor override for the language of this one send. Null/undefined
   *  keeps the booking's own language. */
  locale?: LocaleCode | null;
}): Promise<SendAppointmentUploadLinkResult> {
  const channels = opts.channels.length ? opts.channels : [...UPLOAD_LINK_CHANNELS];

  const appt = await prisma.appointment.findFirst({
    where: {
      id: opts.appointmentId,
      ...(opts.doctorIdScope ? { doctorId: opts.doctorIdScope } : {}),
    },
    select: {
      id: true,
      doctorId: true,
      fullName: true,
      email: true,
      phone: true,
      countryCode: true,
      notificationLocale: true,
    },
  });
  if (!appt) {
    return { ok: false, status: 404, message: "Appointment not found" };
  }
  // The token carries a doctorId and the public upload handler stamps that
  // same id onto the created AppointmentDocument row, so an unassigned
  // appointment has nowhere to file the upload.
  if (!appt.doctorId) {
    return {
      ok: false,
      status: 400,
      message: "Assign a doctor to this appointment before sending an upload link",
    };
  }
  if (!appt.email) {
    return { ok: false, status: 400, message: "This appointment has no patient email" };
  }

  const { token, expiresAt } = await createPatientUploadToken({
    email: appt.email,
    appointmentId: appt.id,
    doctorId: appt.doctorId,
  });
  const link = buildPatientUploadUrl(token);

  // Default: the language the patient booked in, falling back to the locale of
  // the country the consultation was booked in. An explicit `locale` from the
  // admin/doctor overrides it for this send only — it is not written back to
  // the appointment, so the automated notifications keep their own language.
  const lang = resolveNotificationLang({
    notificationLocale: opts.locale ?? appt.notificationLocale,
    countryCode: appt.countryCode,
  });

  const sent: UploadLinkChannel[] = [];
  const failed: UploadLinkChannel[] = [];
  let missingPhone = false;

  if (channels.includes("email")) {
    try {
      const res = await sendPatientUploadLinkEmail({
        to: appt.email,
        patientName: appt.fullName ?? appt.email,
        link,
        lang,
      });
      // `mode: "log"` means no provider is configured — nothing left the box.
      if (res.ok && res.mode !== "log") sent.push("email");
      else failed.push("email");
    } catch {
      failed.push("email");
    }
  }

  if (channels.includes("whatsapp")) {
    if (!appt.phone) {
      missingPhone = true;
      failed.push("whatsapp");
    } else {
      try {
        const wa = await sendWhatsAppText({
          to: appt.phone,
          message: uploadLinkWhatsAppGeneral(lang, link),
        });
        if (wa.ok && !wa.skipped) sent.push("whatsapp");
        else failed.push("whatsapp");
      } catch {
        failed.push("whatsapp");
      }
    }
  }

  return { ok: true, link, expiresAt, sent, failed, missingPhone, lang };
}
