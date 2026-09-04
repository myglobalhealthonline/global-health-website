import { GeneratedDocumentType } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { normalizeDbError } from "../modules/shared/db-errors.js";

export const MEDICAL_DOC_ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export const MEDICAL_DOC_MAX_BYTES = 10 * 1024 * 1024;

export const VALID_DOCUMENT_TYPES = new Set([
  "REPORT",
  "EXAM_REQUEST",
  "EXAM_RESULT",
  "CONSULT_SUMMARY",
  "PRESCRIPTION",
  "OTHER",
]);

/** MedicalDocument types the patient must never see in Medical Files:
 *  medicine prescriptions and consultation summaries. */
export const PATIENT_HIDDEN_TYPES = new Set(["PRESCRIPTION", "CONSULT_SUMMARY"]);

/** GeneratedDocument types surfaced to the patient (excludes medicine
 *  PRESCRIPTION). Keys are `GeneratedDocumentType` enum values. */
export const PATIENT_VISIBLE_GENERATED_TYPES: GeneratedDocumentType[] = [
  GeneratedDocumentType.EXAMS_PRESCRIPTION,
  GeneratedDocumentType.ABSENCE_CERTIFICATE,
  GeneratedDocumentType.CUSTOM_CERTIFICATE,
  GeneratedDocumentType.ATTENDANCE_CERTIFICATE,
  GeneratedDocumentType.OTHER,
];

/** Discriminator so the patient list + download can route a row back to the
 *  right table/storage key. */
export type MedicalDocSource = "MEDICAL_DOC" | "GENERATED" | "APPOINTMENT";

/** Category buckets the patient Medical Files UI tabs on. */
export type MedicalDocCategory =
  | "MY_UPLOAD"
  | "EXAM_PRESCRIPTION"
  | "EXAM_RESULT"
  | "CERTIFICATE"
  | "DOCTOR_DOCUMENT"
  /** Uploaded for the patient by the clinic team (admin), as opposed to by
   *  the treating doctor — its own tab in the portal. */
  | "CLINIC_DOCUMENT";

export type UnifiedPatientDocument = {
  source: MedicalDocSource;
  id: string;
  category: MedicalDocCategory;
  title: string;
  description: string | null;
  fileName: string;
  mimetype: string;
  byteSize: number;
  createdAt: string;
  /** For EXAM_RESULT rows: the GeneratedDocument (exam prescription) this
   *  barcode upload answers, so the UI can nest result under prescription. */
  sourceGeneratedDocumentId: string | null;
  /** Sequential exam-prescription number (EXAMS_PRESCRIPTION rows only). */
  prescriptionNumber: number | null;
};

/** Human title for a GeneratedDocument, mirroring the doctor-side
 *  `titleForGenerated` in all-documents-card.tsx. */
function generatedTitle(documentType: string, metadata: unknown): string {
  if (documentType === "OTHER") {
    const meta = metadata as { customLabel?: unknown } | null;
    if (meta && typeof meta.customLabel === "string" && meta.customLabel.trim()) {
      return meta.customLabel.trim();
    }
    return "Document";
  }
  return (
    {
      ABSENCE_CERTIFICATE: "Absence certificate",
      EXAMS_PRESCRIPTION: "Exam prescription",
      CUSTOM_CERTIFICATE: "Certificate",
      ATTENDANCE_CERTIFICATE: "Attendance certificate",
    }[documentType] ?? documentType
  );
}

function generatedCategory(documentType: string): MedicalDocCategory {
  if (documentType === "EXAMS_PRESCRIPTION") return "EXAM_PRESCRIPTION";
  return "CERTIFICATE"; // ABSENCE_CERTIFICATE, CUSTOM_CERTIFICATE, OTHER
}

function medicalDocCategory(documentType: string, uploadedByRole: string): MedicalDocCategory {
  if (uploadedByRole === "PATIENT") return "MY_UPLOAD";
  if (documentType === "EXAM_REQUEST") return "EXAM_PRESCRIPTION";
  return "DOCTOR_DOCUMENT"; // EXAM_RESULT, REPORT, OTHER shared by doctor
}

/**
 * Unified patient view of Medical Files — unions MedicalDocument (patient +
 * doctor-shared, minus hidden clinical types), sent GeneratedDocument PDFs,
 * and AppointmentDocument uploads (doctor uploads + patient barcode results)
 * across every appointment the patient has. Single source of truth per table;
 * no duplication. Sorted newest-first.
 */
export async function listPatientUnifiedDocuments(
  patientProfileId: string,
  patientEmail: string,
): Promise<UnifiedPatientDocument[]> {
  try {
    const appointmentIds = (
      await prisma.appointment.findMany({
        where: { email: { equals: patientEmail, mode: "insensitive" } },
        select: { id: true },
      })
    ).map((a) => a.id);

    const [medicalDocs, generated, appointmentDocs] = await Promise.all([
      prisma.medicalDocument.findMany({
        where: {
          patientProfileId,
          OR: [{ uploadedByRole: "PATIENT" }, { visibleToPatient: true }],
          documentType: { notIn: Array.from(PATIENT_HIDDEN_TYPES) },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          documentType: true,
          title: true,
          description: true,
          fileName: true,
          mimetype: true,
          byteSize: true,
          uploadedByRole: true,
          createdAt: true,
        },
      }),
      prisma.generatedDocument.findMany({
        where: {
          patientEmail: { equals: patientEmail, mode: "insensitive" },
          sentToPatient: true,
          documentType: { in: PATIENT_VISIBLE_GENERATED_TYPES },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          documentType: true,
          fileName: true,
          prescriptionNumber: true,
          metadata: true,
          createdAt: true,
        },
      }),
      appointmentIds.length
        ? prisma.appointmentDocument.findMany({
            where: { appointmentId: { in: appointmentIds } },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              label: true,
              storageKey: true,
              mimetype: true,
              byteSize: true,
              sourceGeneratedDocumentId: true,
              uploadedByRole: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const rows: UnifiedPatientDocument[] = [];

    for (const d of medicalDocs) {
      rows.push({
        source: "MEDICAL_DOC",
        id: d.id,
        category: medicalDocCategory(d.documentType, d.uploadedByRole),
        title: d.title,
        description: d.description ?? null,
        fileName: d.fileName,
        mimetype: d.mimetype,
        byteSize: d.byteSize,
        createdAt: d.createdAt.toISOString(),
        sourceGeneratedDocumentId: null,
        prescriptionNumber: null,
      });
    }

    for (const g of generated) {
      rows.push({
        source: "GENERATED",
        id: g.id,
        category: generatedCategory(g.documentType),
        title: generatedTitle(g.documentType, g.metadata),
        description: null,
        fileName: g.fileName,
        mimetype: "application/pdf",
        byteSize: 0,
        createdAt: g.createdAt.toISOString(),
        sourceGeneratedDocumentId: null,
        prescriptionNumber: g.prescriptionNumber ?? null,
      });
    }

    for (const a of appointmentDocs) {
      const isResult = Boolean(a.sourceGeneratedDocumentId);
      // Provenance is null on every row predating the column — those keep
      // reading as doctor uploads, exactly how they already surfaced.
      const fromClinic = a.uploadedByRole === "ADMIN";
      rows.push({
        source: "APPOINTMENT",
        id: a.id,
        category: isResult ? "EXAM_RESULT" : fromClinic ? "CLINIC_DOCUMENT" : "DOCTOR_DOCUMENT",
        title: a.label || a.storageKey.split("/").pop() || "Document",
        description: null,
        fileName: a.label || a.storageKey.split("/").pop() || "document",
        mimetype: a.mimetype,
        byteSize: a.byteSize,
        createdAt: a.createdAt.toISOString(),
        sourceGeneratedDocumentId: a.sourceGeneratedDocumentId ?? null,
        prescriptionNumber: null,
      });
    }

    rows.sort((x, y) => (x.createdAt < y.createdAt ? 1 : x.createdAt > y.createdAt ? -1 : 0));
    return rows;
  } catch (error) {
    throw normalizeDbError(error, "Could not load medical documents");
  }
}

/** Patient download access for a GeneratedDocument (sent + visible type). */
export async function getPatientAccessibleGeneratedDocument(
  patientEmail: string,
  documentId: string,
) {
  try {
    const doc = await prisma.generatedDocument.findFirst({
      where: {
        id: documentId,
        patientEmail: { equals: patientEmail, mode: "insensitive" },
        sentToPatient: true,
        documentType: { in: PATIENT_VISIBLE_GENERATED_TYPES },
      },
      select: { id: true, storageKey: true, fileName: true },
    });
    return doc;
  } catch (error) {
    throw normalizeDbError(error, "Could not load document");
  }
}

/** Patient download access for an AppointmentDocument on one of the patient's
 *  own appointments (doctor upload or their own barcode result). */
export async function getPatientAccessibleAppointmentDocument(
  patientEmail: string,
  documentId: string,
) {
  try {
    const doc = await prisma.appointmentDocument.findFirst({
      where: {
        id: documentId,
        appointment: { email: { equals: patientEmail, mode: "insensitive" } },
      },
      select: { id: true, storageKey: true, label: true, mimetype: true },
    });
    return doc;
  } catch (error) {
    throw normalizeDbError(error, "Could not load document");
  }
}

export type CreateMedicalDocumentParams = {
  patientProfileId: string;
  globalHealthNumber: string | null;
  uploadedByUserId: string | null;
  uploadedByRole: string;
  documentType: string;
  title: string;
  description?: string | null;
  fileKey: string;
  fileName: string;
  mimetype: string;
  byteSize: number;
  relatedAppointmentId?: string | null;
  relatedConsultationId?: string | null;
  visibleToPatient?: boolean;
};

export async function createMedicalDocument(params: CreateMedicalDocumentParams) {
  try {
    return await prisma.medicalDocument.create({ data: params });
  } catch (error) {
    throw normalizeDbError(error, "Could not save medical document");
  }
}

/** Patient view: own uploads + docs the doctor/admin made visible. */
export async function listPatientMedicalDocuments(
  patientProfileId: string,
  documentTypes?: string[],
) {
  try {
    return await prisma.medicalDocument.findMany({
      where: {
        patientProfileId,
        OR: [{ uploadedByRole: "PATIENT" }, { visibleToPatient: true }],
        ...(documentTypes?.length ? { documentType: { in: documentTypes } } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        documentType: true,
        title: true,
        description: true,
        fileName: true,
        mimetype: true,
        byteSize: true,
        uploadedByRole: true,
        visibleToPatient: true,
        relatedAppointmentId: true,
        relatedConsultationId: true,
        createdAt: true,
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not load medical documents");
  }
}

/**
 * How many documents the clinic side has added since the patient last opened
 * Medical Files — the number in the nav badge, same idea as unread chat.
 *
 * Counts only what the patient did NOT put there themselves: their own
 * MedicalDocument uploads and their own upload-link files never badge. A null
 * `seenAt` (never opened) counts everything, which is the right fresh state.
 */
export async function countNewPatientDocuments(
  patientProfileId: string,
  patientEmail: string,
  seenAt: Date | null,
): Promise<number> {
  const newer = seenAt ? { gt: seenAt } : undefined;
  try {
    const appointmentIds = (
      await prisma.appointment.findMany({
        where: { email: { equals: patientEmail, mode: "insensitive" } },
        select: { id: true },
      })
    ).map((a) => a.id);

    const [medicalDocs, generated, appointmentDocs] = await Promise.all([
      prisma.medicalDocument.count({
        where: {
          patientProfileId,
          visibleToPatient: true,
          uploadedByRole: { not: "PATIENT" },
          documentType: { notIn: Array.from(PATIENT_HIDDEN_TYPES) },
          ...(newer ? { createdAt: newer } : {}),
        },
      }),
      prisma.generatedDocument.count({
        where: {
          patientEmail: { equals: patientEmail, mode: "insensitive" },
          sentToPatient: true,
          documentType: { in: PATIENT_VISIBLE_GENERATED_TYPES },
          ...(newer ? { createdAt: newer } : {}),
        },
      }),
      appointmentIds.length
        ? prisma.appointmentDocument.count({
            where: {
              appointmentId: { in: appointmentIds },
              uploadedByRole: { not: "PATIENT" },
              // Exam results are uploads the patient made against their own
              // prescription, including on rows predating the provenance
              // column — never a new document TO them.
              sourceGeneratedDocumentId: null,
              ...(newer ? { createdAt: newer } : {}),
            },
          })
        : Promise.resolve(0),
    ]);

    return medicalDocs + generated + appointmentDocs;
  } catch (error) {
    throw normalizeDbError(error, "Could not count new medical documents");
  }
}

/** Stamp "the patient has now seen Medical Files", clearing the nav badge. */
export async function markPatientMedicalFilesSeen(patientProfileId: string) {
  try {
    await prisma.patientProfile.update({
      where: { id: patientProfileId },
      data: { medicalFilesSeenAt: new Date() },
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not update medical files state");
  }
}
/** Check patient owns/can access this doc. */
export async function getPatientAccessibleDocument(
  patientProfileId: string,
  documentId: string,
) {
  try {
    return await prisma.medicalDocument.findFirst({
      where: {
        id: documentId,
        patientProfileId,
        OR: [{ uploadedByRole: "PATIENT" }, { visibleToPatient: true }],
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not load document");
  }
}

/** Doctor view: all docs for a patient that the doctor can access.
 *  `patientEmail` is required for Appointment scoping (Appointment uses email, not profileId). */
export async function listMedicalDocumentsForDoctor(
  patientProfileId: string,
  patientEmail: string,
  doctorId: string,
  documentTypes?: string[],
) {
  try {
    const appointmentIds = (
      await prisma.appointment.findMany({
        where: { doctorId, email: { equals: patientEmail, mode: "insensitive" } },
        select: { id: true },
      })
    ).map((a) => a.id);

    return await prisma.medicalDocument.findMany({
      where: {
        patientProfileId,
        OR: [
          { uploadedByRole: "PATIENT" },
          { visibleToPatient: true },
          ...(appointmentIds.length
            ? [{ uploadedByRole: "DOCTOR", relatedAppointmentId: { in: appointmentIds } }]
            : []),
        ],
        ...(documentTypes?.length ? { documentType: { in: documentTypes } } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        documentType: true,
        title: true,
        description: true,
        fileName: true,
        mimetype: true,
        byteSize: true,
        uploadedByRole: true,
        visibleToPatient: true,
        relatedAppointmentId: true,
        relatedConsultationId: true,
        createdAt: true,
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not load medical documents");
  }
}

/** Admin view: all docs for a patient. */
export async function listMedicalDocumentsAdmin(patientProfileId: string) {
  try {
    return await prisma.medicalDocument.findMany({
      where: { patientProfileId },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not load medical documents");
  }
}

export async function setMedicalDocumentVisibility(documentId: string, visibleToPatient: boolean) {
  try {
    return await prisma.medicalDocument.update({
      where: { id: documentId },
      data: { visibleToPatient },
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not update document visibility");
  }
}
