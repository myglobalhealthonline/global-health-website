import { randomUUID } from "node:crypto";
import { prisma } from "../../db/prisma.js";
import {
  getObject,
  putObject,
  readObjectBodyToBuffer,
  isMediaStorageConfigured,
} from "../../services/object-storage.js";
import { sanitizeOriginalFilename } from "../../utils/media-key.js";

/**
 * Cross-jurisdiction prescription — what actually travels with the patient.
 *
 * The consent the patient signs is "share my consultation record with the
 * prescribing doctor". Before this module existed only the SOAP snapshot
 * travelled, and it travelled to ONE surface (the Doctor B inbox card) that
 * disappears the moment the request is decided. Doctor B opened the async
 * appointment and saw a patient with no date of birth, no booking reason, no
 * address, no attachments and — because the patient chart is scoped to
 * `doctorId = self` — no history at all.
 *
 * Two things happen here, both on the SOURCE appointment's record only (never
 * the patient's wider chart, which is outside what they consented to):
 *
 *  1. `copyDisclosedPatientContext` — demographics + the booking reason are
 *     copied onto the async appointment so the workspace renders a real patient.
 *  2. `copyDisclosedDocuments` — every attachment and doctor-generated PDF on
 *     the source consultation is re-materialised as an `AppointmentDocument`
 *     owned by Doctor B, so it lists + downloads through the existing routes.
 *
 * Documents are copied as NEW S3 objects rather than second rows pointing at
 * the same key: `DELETE /api/doctor/documents/:id` deletes the underlying
 * object, so a shared key would let Doctor B's cleanup destroy Doctor A's
 * original. They are also copied as attachments rather than as
 * `GeneratedDocument` rows — a prescription Doctor A issued must not
 * re-materialise as one Doctor B issued.
 */

/**
 * Disclosed files keep their original filename. Provenance rides on
 * `AppointmentDocument.disclosedFromDoctorId` instead of a name prefix — the
 * prefix pushed the actual filename out of the chart's "File name" column, and
 * it duplicated the "Uploaded by" column right next to it.
 */
function disclosedLabel(name: string): string {
  return name.slice(0, 200);
}

export type DisclosureLog = {
  warn: (obj: unknown, msg?: string) => void;
};

/**
 * Copy the source appointment's patient context onto the async appointment.
 * Only fills blanks — never overwrites something Doctor B already recorded —
 * so it is safe to re-run (payment webhook redelivery, backfill script).
 */
export async function copyDisclosedPatientContext(args: {
  sourceAppointmentId: string;
  targetAppointmentId: string;
  log?: DisclosureLog;
}): Promise<void> {
  const { sourceAppointmentId, targetAppointmentId, log } = args;
  try {
    const [source, target] = await Promise.all([
      prisma.appointment.findUnique({
        where: { id: sourceAppointmentId },
        select: {
          dateOfBirth: true,
          notes: true,
          symptoms: true,
          pharmacy: true,
          consultationLanguageCode: true,
          patientTimezone: true,
          addressLine1: true,
          addressLine2: true,
          addressCity: true,
          addressState: true,
          addressPostalCode: true,
          addressCountryCode: true,
        },
      }),
      prisma.appointment.findUnique({
        where: { id: targetAppointmentId },
        select: {
          dateOfBirth: true,
          notes: true,
          symptoms: true,
          pharmacy: true,
          consultationLanguageCode: true,
          patientTimezone: true,
          addressLine1: true,
        },
      }),
    ]);
    if (!source || !target) return;

    const data: Record<string, unknown> = {};
    if (!target.dateOfBirth && source.dateOfBirth) data.dateOfBirth = source.dateOfBirth;
    if (!target.notes && source.notes) data.notes = source.notes;
    if (!target.symptoms && source.symptoms) data.symptoms = source.symptoms;
    if (!target.pharmacy && source.pharmacy) data.pharmacy = source.pharmacy;
    if (!target.consultationLanguageCode && source.consultationLanguageCode) {
      data.consultationLanguageCode = source.consultationLanguageCode;
    }
    if (!target.patientTimezone && source.patientTimezone) {
      data.patientTimezone = source.patientTimezone;
    }
    // Address travels as one block — a half-copied address is worse than none.
    if (!target.addressLine1 && source.addressLine1) {
      data.addressLine1 = source.addressLine1;
      data.addressLine2 = source.addressLine2;
      data.addressCity = source.addressCity;
      data.addressState = source.addressState;
      data.addressPostalCode = source.addressPostalCode;
      data.addressCountryCode = source.addressCountryCode;
    }
    if (Object.keys(data).length === 0) return;

    await prisma.appointment.update({ where: { id: targetAppointmentId }, data });
  } catch (err) {
    log?.warn({ err, sourceAppointmentId, targetAppointmentId }, "Cross-border patient-context copy failed");
  }
}

/**
 * Re-materialise the source consultation's documents onto the async
 * appointment as Doctor B-owned attachments. Best-effort per file: one
 * unreadable object must not cost the doctor the rest of the record.
 * Idempotent — a label already present on the target is skipped, so webhook
 * redelivery and the backfill script don't duplicate files.
 */
export async function copyDisclosedDocuments(args: {
  sourceAppointmentId: string;
  targetAppointmentId: string;
  targetDoctorId: string;
  sourceDoctorId: string;
  log?: DisclosureLog;
}): Promise<{ copied: number; skipped: number; failed: number }> {
  const { sourceAppointmentId, targetAppointmentId, targetDoctorId, sourceDoctorId, log } = args;
  const result = { copied: 0, skipped: 0, failed: 0 };
  if (!isMediaStorageConfigured()) {
    log?.warn({ sourceAppointmentId }, "Cross-border document copy skipped — storage not configured");
    return result;
  }

  let uploads: { label: string; storageKey: string; mimetype: string }[] = [];
  let generated: { fileName: string; storageKey: string }[] = [];
  let existingLabels = new Set<string>();
  try {
    const [u, g, present] = await Promise.all([
      prisma.appointmentDocument.findMany({
        where: { appointmentId: sourceAppointmentId },
        orderBy: { createdAt: "asc" },
        select: { label: true, storageKey: true, mimetype: true },
      }),
      prisma.generatedDocument.findMany({
        where: { appointmentId: sourceAppointmentId },
        orderBy: { createdAt: "asc" },
        select: { fileName: true, storageKey: true },
      }),
      prisma.appointmentDocument.findMany({
        where: { appointmentId: targetAppointmentId },
        select: { label: true },
      }),
    ]);
    uploads = u;
    generated = g;
    existingLabels = new Set(present.map((p) => p.label));
  } catch (err) {
    log?.warn({ err, sourceAppointmentId }, "Cross-border document copy failed to read source");
    return result;
  }

  const items: { label: string; storageKey: string; mimetype: string }[] = [
    ...uploads.map((u) => ({
      label: disclosedLabel(u.label),
      storageKey: u.storageKey,
      mimetype: u.mimetype,
    })),
    // Generated PDFs carry no mimetype column — they are always PDFs.
    ...generated.map((g) => ({
      label: disclosedLabel(g.fileName),
      storageKey: g.storageKey,
      mimetype: "application/pdf",
    })),
  ];

  for (const item of items) {
    if (existingLabels.has(item.label)) {
      result.skipped += 1;
      continue;
    }
    try {
      const obj = await getObject(item.storageKey);
      const buffer = await readObjectBodyToBuffer(obj.Body);
      if (!buffer) {
        result.failed += 1;
        continue;
      }
      const safeName = sanitizeOriginalFilename(item.label);
      const storageKey = `clinical/${targetDoctorId}/${targetAppointmentId}/${randomUUID()}-${safeName}`;
      await putObject(storageKey, buffer, obj.ContentType ?? item.mimetype);
      await prisma.appointmentDocument.create({
        data: {
          appointmentId: targetAppointmentId,
          // Owner = the RECEIVING doctor: this is what the download route
          // authorises against. Provenance is carried separately below so the
          // chart credits the file to whoever actually produced it.
          doctorId: targetDoctorId,
          disclosedFromDoctorId: sourceDoctorId,
          label: item.label,
          storageKey,
          mimetype: obj.ContentType ?? item.mimetype,
          byteSize: buffer.length,
        },
      });
      existingLabels.add(item.label);
      result.copied += 1;
    } catch (err) {
      result.failed += 1;
      log?.warn({ err, storageKey: item.storageKey, targetAppointmentId }, "Cross-border document copy failed");
    }
  }
  return result;
}

// ── Doctor B: the disclosed record, readable from the async appointment ──────

export type DisclosedCrossBorderRecord = {
  requestId: string;
  status: string;
  requestedAt: string;
  sourceDoctorName: string | null;
  clinicalSummary: string;
  soap: {
    chiefComplaint: string | null;
    subjective: string | null;
    objective: string | null;
    assessment: string | null;
    plan: string | null;
  };
};

/**
 * The disclosed source record for an async cross-border appointment, for the
 * prescribing doctor's workspace. Returns null when the appointment is not a
 * cross-border async consult, when the caller is not its target doctor (admins
 * excepted), or when the patient has not yet consented — the SOAP snapshot is
 * only disclosable once the request has advanced past PENDING_CONSENT.
 *
 * Unlike the inbox card, this stays readable after the request is decided:
 * a signed prescription that cites a record the prescriber can no longer open
 * is not a record.
 */
export async function getDisclosedCrossBorderRecord(
  appointmentId: string,
  viewer: { doctorId: string | null; isAdmin: boolean },
): Promise<DisclosedCrossBorderRecord | null> {
  const request = await prisma.crossBorderPrescriptionRequest.findFirst({
    where: { asyncAppointmentId: appointmentId },
    select: {
      id: true,
      status: true,
      createdAt: true,
      clinicalSummary: true,
      targetDoctorId: true,
      sourceDoctorId: true,
      sourceChiefComplaint: true,
      sourceSubjective: true,
      sourceObjective: true,
      sourceAssessment: true,
      sourcePlan: true,
    },
  });
  if (!request) return null;
  if (request.status === "PENDING_CONSENT") return null;
  if (!viewer.isAdmin && request.targetDoctorId !== viewer.doctorId) return null;

  const sourceDoctor = await prisma.doctor.findUnique({
    where: { id: request.sourceDoctorId },
    select: { fullName: true },
  });

  return {
    requestId: request.id,
    status: request.status,
    requestedAt: request.createdAt.toISOString(),
    sourceDoctorName: sourceDoctor?.fullName ?? null,
    clinicalSummary: request.clinicalSummary,
    soap: {
      chiefComplaint: request.sourceChiefComplaint,
      subjective: request.sourceSubjective,
      objective: request.sourceObjective,
      assessment: request.sourceAssessment,
      plan: request.sourcePlan,
    },
  };
}
