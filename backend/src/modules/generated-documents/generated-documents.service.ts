import type { GeneratedDocument, GeneratedDocumentType } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import {
  putObject,
  deleteObject,
  getObject,
  streamToNodeReadable,
  isMediaStorageConfigured,
} from "../../services/object-storage.js";
import { sendGeneratedDocumentEmail } from "../../lib/email/templates.js";
import { resolveAppointmentDocumentSource } from "./appointment-document-source.js";
import {
  ABSENCE_DEFAULT_REASON,
  formatDateDdMmYyyy,
  formatExamsNotes,
  isInReviewQueue,
  isVisibleInHistory,
} from "./document-template-utils.js";
import { getHealthPortalForCountry } from "./country-portals.js";
import { renderDocxTemplatePdf } from "./docx-document-renderer.js";
import { renderDocumentPdf } from "./html-document-renderer.js";

const TITLES: Record<GeneratedDocumentType, string> = {
  ABSENCE_CERTIFICATE: "Medical absence certificate",
  EXAMS_PRESCRIPTION: "Examinations prescription",
  PRESCRIPTION: "Medical prescription",
  OTHER: "Document",
};

function buildTemplateContext(input: {
  documentType: GeneratedDocumentType;
  title: string;
  appt: {
    fullName: string;
    countryCode: string;
    dateOfBirth: Date | null;
    scheduledAt: Date | null;
    consultationType: string;
    pharmacy: string | null;
  };
  doctorName: string;
  registrationLine: string;
  patientIdLine: string | null;
  address: string;
  birthDate: string;
  fields?: Record<string, string>;
}): Record<string, unknown> {
  const consultationDate = input.appt.scheduledAt
    ? formatDateDdMmYyyy(input.appt.scheduledAt)
    : formatDateDdMmYyyy(new Date());
  const currentDate = formatDateDdMmYyyy(new Date());

  const base: Record<string, unknown> = {
    title: input.title,
    patientName: input.appt.fullName,
    patientIdLine: input.patientIdLine ?? "",
    birthDate: input.birthDate,
    address: input.address,
    consultationDate,
    currentDate,
    doctorName: input.doctorName,
    registrationNumber: input.registrationLine,
    consultationType: input.appt.consultationType,
  };

  const f = input.fields ?? {};

  if (input.documentType === "EXAMS_PRESCRIPTION") {
    base.examsNotes = formatExamsNotes(f.exams, f.notes);
  }

  if (input.documentType === "ABSENCE_CERTIFICATE") {
    base.startDate = f.startDate ? formatDateDdMmYyyy(f.startDate) : "";
    base.endDate = f.endDate ? formatDateDdMmYyyy(f.endDate) : "";
    base.reason = (f.reason ?? "").trim() || ABSENCE_DEFAULT_REASON;
  }

  if (input.documentType === "PRESCRIPTION") {
    for (let i = 1; i <= 7; i++) {
      const key = `medication${i}`;
      if (f[key]?.trim()) base[key] = f[key].trim();
    }
    if (f.pharmacy?.trim()) base.pharmacy = f.pharmacy.trim();
  }

  if (input.documentType === "OTHER") {
    base.body = f.body?.trim() ?? "";
  }

  return base;
}

export async function generateAppointmentDocument(input: {
  appointmentId: string;
  doctorId: string;
  documentType: GeneratedDocumentType;
  fields?: Record<string, string>;
  editDocumentId?: string;
}) {
  if (!isMediaStorageConfigured()) {
    throw new Error("Document storage is not configured");
  }

  const source = await resolveAppointmentDocumentSource(
    input.appointmentId,
    input.doctorId,
  );
  if (!source) return null;

  const appt = await prisma.appointment.findFirst({
    where: { id: input.appointmentId, doctorId: input.doctorId },
    select: {
      id: true,
      fullName: true,
      email: true,
      countryCode: true,
      consultationType: true,
      scheduledAt: true,
      dateOfBirth: true,
      pharmacy: true,
    },
  });
  if (!appt) return null;

  const doctorName = source.doctor.name;
  const registrationLine = source.doctor.registrationLine;
  const patientIdLine = source.patient.patientIdLine;
  const address = source.patient.address === "—" ? "" : source.patient.address;
  const birthDate = source.patient.birthDate === "—" ? "" : source.patient.birthDate;

  if (source.doctor.registrationMissing) {
    console.warn(
      `[generated-documents] missing registration for doctorId=${input.doctorId} country=${appt.countryCode}`,
    );
  }

  const customLabel = input.fields?.customLabel?.trim();
  const title =
    input.documentType === "OTHER" && customLabel
      ? customLabel
      : TITLES[input.documentType];

  const templateContext = buildTemplateContext({
    documentType: input.documentType,
    title,
    appt,
    doctorName,
    registrationLine,
    patientIdLine,
    address,
    birthDate,
    fields: input.fields,
  });

  const templateData: Record<string, string> = {
    patientName: appt.fullName,
    birthDate,
    address,
    consultationDate: templateContext.consultationDate as string,
    currentDate: templateContext.currentDate as string,
    doctorName,
    registrationNumber: registrationLine,
    ...(input.fields ?? {}),
    examsNotes:
      (templateContext.examsNotes as string) ??
      formatExamsNotes(input.fields?.exams, input.fields?.notes),
    startDate: (templateContext.startDate as string) ?? "",
    endDate: (templateContext.endDate as string) ?? "",
    reason: (templateContext.reason as string) ?? "",
  };

  let pdfBuffer =
    (await renderDocxTemplatePdf(appt.countryCode, input.documentType, templateData)) ??
    null;

  if (!pdfBuffer) {
    pdfBuffer = await renderDocumentPdf(appt.countryCode, input.documentType, templateContext);
  }

  const slugBase =
    input.documentType === "OTHER" && customLabel
      ? customLabel
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 40) || "document"
      : input.documentType.toLowerCase().replace(/_/g, "-");
  const fileName = `${slugBase}-${appt.id.slice(0, 8)}.pdf`;
  const storageKey = `generated/${input.doctorId}/${appt.id}/${fileName}`;

  await putObject(storageKey, pdfBuffer, "application/pdf");

  if (input.editDocumentId) {
    const existing = await prisma.generatedDocument.findFirst({
      where: {
        id: input.editDocumentId,
        appointmentId: appt.id,
        doctorId: input.doctorId,
        sentToPatient: false,
      },
    });
    if (existing) {
      await deleteObject(existing.storageKey).catch(() => {});
      const row = await prisma.generatedDocument.update({
        where: { id: existing.id },
        data: {
          fileName,
          storageKey,
          metadata: input.fields ? (input.fields as object) : undefined,
        },
      });
      const portal = getHealthPortalForCountry(appt.countryCode);
      return {
        row,
        pdfUrl: `/api/doctor/documents/generated/${row.id}/pdf`,
        healthPortalUrl: portal?.url ?? null,
        healthPortalLabel: portal?.label ?? null,
      };
    }
  }

  if (input.documentType !== "OTHER" && !input.editDocumentId) {
    const existing = await prisma.generatedDocument.findFirst({
      where: {
        appointmentId: appt.id,
        documentType: input.documentType,
        sentToPatient: false,
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      await deleteObject(existing.storageKey).catch(() => {});
      await prisma.generatedDocument.delete({ where: { id: existing.id } });
    }
  }

  const row = await prisma.generatedDocument.create({
    data: {
      appointmentId: appt.id,
      doctorId: input.doctorId,
      patientEmail: appt.email,
      documentType: input.documentType,
      fileName,
      storageKey,
      metadata: input.fields ? (input.fields as object) : undefined,
    },
  });

  const portal = getHealthPortalForCountry(appt.countryCode);
  return {
    row,
    pdfUrl: `/api/doctor/documents/generated/${row.id}/pdf`,
    healthPortalUrl: portal?.url ?? null,
    healthPortalLabel: portal?.label ?? null,
  };
}

export function partitionGeneratedDocuments(rows: GeneratedDocument[]) {
  const queue = rows.filter((r) => isInReviewQueue(r.documentType, r.sentToPatient));
  const history = rows.filter((r) => isVisibleInHistory(r.documentType, r.sentToPatient));
  return { queue, history, items: rows };
}

export { getAppointmentDocumentContext } from "./appointment-document-source.js";

export async function listGeneratedDocuments(appointmentId: string, doctorId: string) {
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, doctorId },
    select: { id: true },
  });
  if (!appt) return null;
  const rows = await prisma.generatedDocument.findMany({
    where: { appointmentId },
    orderBy: { createdAt: "desc" },
  });
  return partitionGeneratedDocuments(rows);
}

async function readStorageToBuffer(storageKey: string): Promise<Buffer | null> {
  try {
    const obj = await getObject(storageKey);
    const readable = streamToNodeReadable(obj.Body);
    if (!readable) return null;
    const chunks: Buffer[] = [];
    for await (const chunk of readable) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
}

export async function sendGeneratedDocuments(
  doctorId: string,
  appointmentId: string,
  documentIds: string[],
) {
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, doctorId },
    select: { id: true, fullName: true, email: true },
  });
  if (!appt) return null;

  const docs = await prisma.generatedDocument.findMany({
    where: {
      id: { in: documentIds },
      appointmentId,
      doctorId,
      sentToPatient: false,
      documentType: { not: "PRESCRIPTION" },
    },
  });

  let sent = 0;
  for (const doc of docs) {
    const pdfBuffer = await readStorageToBuffer(doc.storageKey);
    const meta = (doc.metadata ?? null) as { customLabel?: unknown } | null;
    const customLabel =
      typeof meta?.customLabel === "string" ? meta.customLabel.trim() : "";
    const documentLabel =
      doc.documentType === "OTHER" && customLabel
        ? customLabel
        : TITLES[doc.documentType];
    const result = await sendGeneratedDocumentEmail({
      to: appt.email,
      patientName: appt.fullName,
      documentType: documentLabel,
      fileName: doc.fileName,
      attachment: pdfBuffer
        ? { filename: doc.fileName, content: pdfBuffer, contentType: "application/pdf" }
        : undefined,
    });
    if (result.ok) {
      await prisma.generatedDocument.update({
        where: { id: doc.id },
        data: { sentToPatient: true },
      });
      sent += 1;
    }
  }

  return sent;
}

export async function getGeneratedDocumentFile(
  doctorId: string,
  documentId: string,
): Promise<{ fileName: string; buffer: Buffer } | null | "not_found"> {
  const doc = await prisma.generatedDocument.findFirst({
    where: { id: documentId, doctorId },
  });
  if (!doc) return "not_found";
  const buffer = await readStorageToBuffer(doc.storageKey);
  if (!buffer) return null;
  return { fileName: doc.fileName, buffer };
}

export async function deleteGeneratedDocument(doctorId: string, documentId: string) {
  const doc = await prisma.generatedDocument.findFirst({
    where: { id: documentId, doctorId },
  });
  if (!doc) return { ok: false as const, message: "Document not found" };
  if (doc.sentToPatient) {
    return { ok: false as const, message: "Cannot delete a document already sent to the patient" };
  }
  await deleteObject(doc.storageKey).catch(() => {});
  await prisma.generatedDocument.delete({ where: { id: doc.id } });
  return { ok: true as const };
}
