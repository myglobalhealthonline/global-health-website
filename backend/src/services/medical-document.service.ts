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
