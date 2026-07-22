import type { GeneratedDocument, GeneratedDocumentType } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import {
  putObject,
  deleteObject,
  getObject,
  readObjectBodyToBuffer,
  isMediaStorageConfigured,
} from "../../services/object-storage.js";
import { sendGeneratedDocumentEmail, sendPatientUploadLinkEmail } from "../../lib/email/templates.js";
import { sendWhatsAppText } from "../../lib/whatsapp/wasender.js";
import { resolveAppointmentDocumentSource } from "./appointment-document-source.js";
import {
  absenceDefaultReason,
  formatDateDdMmYyyy,
  formatExamsNotes,
  isEmailSendable,
  isInReviewQueue,
  isVisibleInHistory,
} from "./document-template-utils.js";
import { getHealthPortalForCountry } from "./country-portals.js";
import { createRequisitionFromPrescription } from "../lab-orders/lab-requisitions.service.js";
import { renderDocxTemplatePdf, type DocxQrOptions } from "./docx-document-renderer.js";
import { renderDocumentPdf } from "./html-document-renderer.js";
import { labelsForPrefix } from "./docx-template-labels.js";
import { templatePrefixForCountry } from "./docx-template-profiles.js";
import { qrPngBuffer, qrDataUrl } from "./qr-code.js";
import {
  buildPatientUploadUrl,
  createPatientUploadToken,
  hashToken,
} from "../patient-upload/patient-upload-link.service.js";

const TITLES: Record<GeneratedDocumentType, string> = {
  ABSENCE_CERTIFICATE: "Medical absence certificate",
  EXAMS_PRESCRIPTION: "Examinations prescription",
  PRESCRIPTION: "Medical prescription",
  OTHER: "Document",
  CUSTOM_CERTIFICATE: "Medical certificate",
};

/** Serialize generate per appointment + type (LibreOffice can take 10–15s). */
const generateMutexByKey = new Map<string, { tail: Promise<void> }>();

function generateLockKey(appointmentId: string, documentType: GeneratedDocumentType): string {
  return `${appointmentId}:${documentType}`;
}

async function withGenerateLock<T>(
  appointmentId: string,
  documentType: GeneratedDocumentType,
  fn: () => Promise<T>,
): Promise<T> {
  const key = generateLockKey(appointmentId, documentType);
  let slot = generateMutexByKey.get(key);
  if (!slot) {
    slot = { tail: Promise.resolve() };
    generateMutexByKey.set(key, slot);
  }
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const prev = slot.tail;
  const myTail = prev.then(() => gate, () => gate);
  slot.tail = myTail;
  await prev;
  try {
    return await fn();
  } finally {
    release();
    // ponytail: drop the mutex entry once the queue drains so a long-lived
    // process doesn't accumulate one Map key per appointment+doc-type
    // forever. Only safe to delete when nobody queued behind us — if
    // `slot.tail` still points at our own chained promise, we're last.
    if (generateMutexByKey.get(key)?.tail === myTail) {
      generateMutexByKey.delete(key);
    }
  }
}

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
  dataProtectionLawName?: string | null;
}): Record<string, unknown> {
  const consultationDate = input.appt.scheduledAt
    ? formatDateDdMmYyyy(input.appt.scheduledAt)
    : formatDateDdMmYyyy(new Date());
  const currentDate = formatDateDdMmYyyy(new Date());

  const COUNTRY_LEGAL_TEXT: Record<string, string> = {
    cz: "Global Health je obchodní značkou společnosti Global Guest s.r.o., poskytovatele zdravotních služeb zapsaného v Národním registru poskytovatelů zdravotních služeb (NRPZS) pod registračním číslem 19071680.",
    pt: "A Global Health é uma marca comercial da Global Guest s.r.o., entidade prestadora de cuidados de saúde registada na Entidade Reguladora da Saúde (ERS) sob o número 179287.",
  };
  const countryLegalText = COUNTRY_LEGAL_TEXT[input.appt.countryCode?.toLowerCase() ?? ""] ?? "";

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
    countryLegalText,
  };

  const f = input.fields ?? {};

  if (input.documentType === "EXAMS_PRESCRIPTION") {
    base.examsNotes = formatExamsNotes(f.exams, f.notes);
  }

  if (input.documentType === "ABSENCE_CERTIFICATE") {
    base.startDate = f.startDate ? formatDateDdMmYyyy(f.startDate) : "";
    base.endDate = f.endDate ? formatDateDdMmYyyy(f.endDate) : "";
    base.reason = (f.reason ?? "").trim() || absenceDefaultReason(input.dataProtectionLawName);
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

  if (input.documentType === "CUSTOM_CERTIFICATE") {
    base.certificateName = f.certificateName?.trim() || "Medical Certificate";
    base.singleDate = f.singleDate ? formatDateDdMmYyyy(f.singleDate) : "";
    base.startDate = f.startDate ? formatDateDdMmYyyy(f.startDate) : "";
    base.endDate = f.endDate ? formatDateDdMmYyyy(f.endDate) : "";
    base.reason = f.reason?.trim() ?? "";
  }

  return base;
}

type ExamUploadArtifacts = {
  documentId: string;
  prescriptionNumber: number;
  link: string;
  token: string;
  expiresAt: Date;
  pngBuffer: Buffer;
  dataUrl: string;
};

/**
 * For exams prescriptions only: settle the document id + per-appointment
 * sequential number, mint a v3 (per-prescription) upload token, and render the
 * link as QR (PNG for DOCX, data URL for HTML). Returns null for other types.
 */
async function buildExamUploadArtifacts(input: {
  documentType: GeneratedDocumentType;
  appointmentId: string;
  doctorId: string;
  patientEmail: string;
  editDocumentId?: string;
}): Promise<ExamUploadArtifacts | null> {
  if (input.documentType !== "EXAMS_PRESCRIPTION") return null;

  let existing: { id: string; prescriptionNumber: number | null } | null = null;
  if (input.editDocumentId) {
    existing = await prisma.generatedDocument.findFirst({
      where: {
        id: input.editDocumentId,
        appointmentId: input.appointmentId,
        doctorId: input.doctorId,
        sentToPatient: false,
      },
      select: { id: true, prescriptionNumber: true },
    });
  }

  const documentId = existing?.id ?? randomUUID();
  let prescriptionNumber = existing?.prescriptionNumber ?? null;
  if (prescriptionNumber == null) {
    // sentCount + 1 — stable across redraws of the live draft, locks on send.
    const sentCount = await prisma.generatedDocument.count({
      where: {
        appointmentId: input.appointmentId,
        documentType: "EXAMS_PRESCRIPTION",
        sentToPatient: true,
      },
    });
    prescriptionNumber = sentCount + 1;
  }

  const { token, expiresAt } = await createPatientUploadToken({
    email: input.patientEmail,
    appointmentId: input.appointmentId,
    doctorId: input.doctorId,
    documentId,
  });
  const link = buildPatientUploadUrl(token);
  const [pngBuffer, dataUrl] = await Promise.all([qrPngBuffer(link), qrDataUrl(link)]);

  return { documentId, prescriptionNumber, link, token, expiresAt, pngBuffer, dataUrl };
}

type CertificateArtifacts = {
  certificateId: string;
  verifyUrl: string;
  pngBuffer: Buffer;
  dataUrl: string;
};

const VERIFIABLE_TYPES = new Set<GeneratedDocumentType>([
  "CUSTOM_CERTIFICATE",
  "ABSENCE_CERTIFICATE",
  "PRESCRIPTION",
  "EXAMS_PRESCRIPTION",
]);

async function buildCertificateArtifacts(
  documentType: GeneratedDocumentType,
  editDocumentId?: string,
): Promise<CertificateArtifacts | null> {
  if (!VERIFIABLE_TYPES.has(documentType)) return null;

  let certificateId: string;
  if (editDocumentId) {
    const existing = await prisma.generatedDocument.findFirst({
      where: { id: editDocumentId, documentType, sentToPatient: false },
      select: { certificateId: true },
    });
    certificateId = existing?.certificateId ?? randomUUID();
  } else {
    certificateId = randomUUID();
  }

  const base = (env.PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const verifyUrl = `${base}/verify/certificate/${certificateId}`;
  const [pngBuffer, dataUrl] = await Promise.all([qrPngBuffer(verifyUrl), qrDataUrl(verifyUrl)]);
  return { certificateId, verifyUrl, pngBuffer, dataUrl };
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

  return withGenerateLock(input.appointmentId, input.documentType, () =>
    generateAppointmentDocumentUnlocked(input),
  );
}

async function generateAppointmentDocumentUnlocked(input: {
  appointmentId: string;
  doctorId: string;
  documentType: GeneratedDocumentType;
  fields?: Record<string, string>;
  editDocumentId?: string;
}) {
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
  // Localized document titles for the standard clinical types; custom/OTHER
  // keep the doctor-supplied label.
  const docLabels = labelsForPrefix(templatePrefixForCountry(appt.countryCode ?? "") ?? "IR");
  const title =
    input.documentType === "OTHER" && customLabel
      ? customLabel
      : input.documentType === "ABSENCE_CERTIFICATE"
        ? docLabels.docTitleAbsence
        : input.documentType === "EXAMS_PRESCRIPTION"
          ? docLabels.docTitleExams
          : input.documentType === "PRESCRIPTION"
            ? docLabels.docTitlePrescription
            : TITLES[input.documentType];

  // Absence certificates print a default confidentiality reason that names
  // the data-protection law. That name is per-country (GDPR, LGPD, …) and
  // configured on CountryLegalProfile by the admin.
  let dataProtectionLawName: string | null = null;
  if (input.documentType === "ABSENCE_CERTIFICATE" && appt.countryCode) {
    const country = await prisma.country.findFirst({
      where: { code: { equals: appt.countryCode, mode: "insensitive" } },
      select: { legalProfile: { select: { dataProtectionLawName: true } } },
    });
    dataProtectionLawName = country?.legalProfile?.dataProtectionLawName ?? null;
  }

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
    dataProtectionLawName,
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

  // Exams prescriptions get a unique, numbered patient-upload link engraved as
  // a QR code so the patient can scan it and send their results back. The link
  // is bound to THIS document id, so we settle the id (+ number) before render.
  const upload = await buildExamUploadArtifacts({
    documentType: input.documentType,
    appointmentId: appt.id,
    doctorId: input.doctorId,
    patientEmail: appt.email,
    editDocumentId: input.editDocumentId,
  });
  let qr: DocxQrOptions | undefined;
  if (upload) {
    qr = {
      pngBuffer: upload.pngBuffer,
      title: `Upload your exam results — Prescription #${upload.prescriptionNumber}`,
      instruction:
        "Scan this QR code with your phone camera to securely upload your test results.",
      compact: true, // exams prescription also gets a verify QR; keep both compact to fit on one page
    };
    templateContext.qrDataUrl = upload.dataUrl;
    templateContext.uploadLink = upload.link;
    templateContext.uploadInstructions = qr.instruction;
    templateContext.prescriptionNumber = upload.prescriptionNumber;
  }

  // All verifiable document types embed a QR linking to the public verification page.
  // Absence/custom certs: verification QR is the primary (sole) QR.
  // Prescriptions: verification QR is compact; exams prescription keeps the upload QR as primary and adds verify QR.
  const cert = await buildCertificateArtifacts(input.documentType, input.editDocumentId);
  if (cert) {
    templateContext.certificateId = cert.certificateId;
    if (input.documentType === "ABSENCE_CERTIFICATE" || input.documentType === "CUSTOM_CERTIFICATE") {
      templateContext.qrDataUrl = cert.dataUrl;
    }
    if (input.documentType === "ABSENCE_CERTIFICATE") {
      qr = {
        pngBuffer: cert.pngBuffer,
        title: "Verify this certificate",
        instruction: `Certificate ID: ${cert.certificateId}`,
        compact: true,
      };
    }
    if (input.documentType === "PRESCRIPTION") {
      templateContext.verifyQrDataUrl = cert.dataUrl;
      templateContext.documentId = cert.certificateId;
      qr = {
        pngBuffer: cert.pngBuffer,
        title: "Verify this prescription",
        instruction: `Document ID: ${cert.certificateId}`,
        compact: true,
      };
    }
    if (input.documentType === "EXAMS_PRESCRIPTION") {
      templateContext.verifyQrDataUrl = cert.dataUrl;
      templateContext.documentId = cert.certificateId;
      if (qr) {
        qr.verifyQr = {
          pngBuffer: cert.pngBuffer,
          title: "Verify this prescription",
          instruction: `Document ID: ${cert.certificateId}`,
        };
      }
    }
  }

  // HTML (Variant K design system) is the primary renderer; the legacy
  // per-country DOCX/LibreOffice path remains as fallback only.
  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await renderDocumentPdf(appt.countryCode, input.documentType, templateContext);
  } catch {
    pdfBuffer = null;
  }

  if (!pdfBuffer?.length) {
    pdfBuffer =
      (await renderDocxTemplatePdf(appt.countryCode, input.documentType, templateData, qr)) ??
      null;
  }

  if (!pdfBuffer?.length) {
    throw new Error("PDF generation produced an empty file");
  }

  // Sequential number for this doc type on this appointment (01, 02 …).
  // EXAMS_PRESCRIPTION reuses the already-computed prescriptionNumber.
  // All other types count existing rows of the same type (excluding the
  // current edit target so a redraw keeps the same number).
  let docSeqNumber: number;
  if (upload) {
    docSeqNumber = upload.prescriptionNumber;
  } else {
    const existingCount = await prisma.generatedDocument.count({
      where: {
        appointmentId: appt.id,
        documentType: input.documentType,
        ...(input.editDocumentId ? { id: { not: input.editDocumentId } } : {}),
      },
    });
    docSeqNumber = existingCount + 1;
  }
  const seqSuffix = String(docSeqNumber).padStart(2, "0");

  // Patient name slug (preserves case, safe for filenames and HTTP headers).
  const patientSlug = appt.fullName
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40) || "patient";

  // Human-readable doc type label for the filename.
  const DOC_TYPE_FILENAME: Record<string, string> = {
    EXAMS_PRESCRIPTION: "exam-prescription",
    PRESCRIPTION: "medicine-prescription",
    ABSENCE_CERTIFICATE: "absence-certificate",
    OTHER: "document",
    CUSTOM_CERTIFICATE: "certificate",
  };
  const certNameForFile =
    input.documentType === "CUSTOM_CERTIFICATE"
      ? (input.fields?.certificateName ?? "").trim()
      : "";
  const docTypeLabel =
    input.documentType === "OTHER" && customLabel
      ? customLabel.replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "-").slice(0, 40) || "document"
      : input.documentType === "CUSTOM_CERTIFICATE" && certNameForFile
        ? certNameForFile.replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "-").slice(0, 40)
        : (DOC_TYPE_FILENAME[input.documentType] ?? input.documentType.toLowerCase().replace(/_/g, "-"));

  const fileName = `${patientSlug}-${docTypeLabel}-${seqSuffix}.pdf`;
  const storageKey = `generated/${input.doctorId}/${appt.id}/${randomUUID()}/${fileName}`;

  await putObject(storageKey, pdfBuffer, "application/pdf");

  try {
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
      const previousStorageKey = existing.storageKey;
      const row = await prisma.generatedDocument.update({
        where: { id: existing.id },
        data: {
          fileName,
          storageKey,
          metadata: input.fields ? (input.fields as object) : undefined,
          ...(upload
            ? {
                prescriptionNumber: upload.prescriptionNumber,
                uploadTokenHash: hashToken(upload.token),
                uploadTokenExpiresAt: upload.expiresAt,
              }
            : {}),
          ...(cert ? { certificateId: cert.certificateId } : {}),
        },
      });
      if (previousStorageKey !== storageKey) {
        await deleteObject(previousStorageKey).catch(() => {});
      }
      const portal = getHealthPortalForCountry(appt.countryCode);
      return {
        row,
        pdfUrl: `/api/doctor/documents/generated/${row.id}/pdf`,
        healthPortalUrl: portal?.url ?? null,
        healthPortalLabel: portal?.label ?? null,
      };
    }
  }

  const row = await prisma.generatedDocument.create({
    data: {
      // Exams prescriptions pin an explicit id so the QR/upload-link token
      // minted before render binds to the same row.
      ...(upload ? { id: upload.documentId } : {}),
      appointmentId: appt.id,
      doctorId: input.doctorId,
      patientEmail: appt.email,
      documentType: input.documentType,
      fileName,
      storageKey,
      metadata: input.fields ? (input.fields as object) : undefined,
      ...(upload
        ? {
            prescriptionNumber: upload.prescriptionNumber,
            uploadTokenHash: hashToken(upload.token),
            uploadTokenExpiresAt: upload.expiresAt,
          }
        : {}),
      ...(cert ? { certificateId: cert.certificateId } : {}),
    },
  });

  if (input.documentType !== "OTHER" && !input.editDocumentId) {
    const prior = await prisma.generatedDocument.findMany({
      where: {
        appointmentId: appt.id,
        documentType: input.documentType,
        sentToPatient: false,
        id: { not: row.id },
      },
      select: { id: true, storageKey: true },
    });
    await Promise.all(
      prior.map(async (old) => {
        await deleteObject(old.storageKey).catch(() => {});
        await prisma.generatedDocument.delete({ where: { id: old.id } }).catch(() => {});
      }),
    );
  }

  const portal = getHealthPortalForCountry(appt.countryCode);
  return {
    row,
    pdfUrl: `/api/doctor/documents/generated/${row.id}/pdf`,
    healthPortalUrl: portal?.url ?? null,
    healthPortalLabel: portal?.label ?? null,
  };
  } catch (err) {
    await deleteObject(storageKey).catch((cleanupErr) => {
      // Log but don't mask the original error — orphaned S3 object at
      // storageKey will need manual cleanup if this fires.
      console.error("[generated-documents] S3 cleanup failed after DB error", {
        storageKey,
        cleanupErr,
      });
    });
    throw err;
  }
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
  await purgeOrphanGeneratedDocuments(appointmentId);
  const rows = await prisma.generatedDocument.findMany({
    where: { appointmentId },
    orderBy: { createdAt: "desc" },
  });
  return partitionGeneratedDocuments(rows);
}

async function readStorageToBuffer(storageKey: string): Promise<Buffer | null> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const obj = await getObject(storageKey);
      const buffer = await readObjectBodyToBuffer(obj.Body);
      if (buffer?.length) return buffer;
    } catch {
      /* retry */
    }
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }
  return null;
}

/** Remove DB rows whose PDF object is missing from storage (legacy regenerate bug). */
export async function purgeOrphanGeneratedDocuments(appointmentId: string): Promise<number> {
  const rows = await prisma.generatedDocument.findMany({
    where: { appointmentId },
    select: { id: true, storageKey: true, createdAt: true },
  });
  const graceMs = 30_000;
  const now = Date.now();
  let removed = 0;
  for (const row of rows) {
    if (now - row.createdAt.getTime() < graceMs) continue;
    const buffer = await readStorageToBuffer(row.storageKey);
    if (buffer) continue;
    await prisma.generatedDocument.delete({ where: { id: row.id } }).catch(() => {});
    removed += 1;
  }
  return removed;
}

/**
 * Turn a sent exams prescription into a lab requisition in the admin queue.
 *
 * The exams live in the document's stored `metadata`: `exams` is the doctor's
 * one-per-line text (also what the PDF renders) and `examTypeIds` is a
 * newline-separated list positionally aligned with it — one entry per exams
 * line, blank where the doctor typed free text instead of picking from the
 * catalogue. Kept as a string because `fields` is a `Record<string, string>`
 * all the way through generate, metadata and the edit-reload path.
 */
async function openLabRequisitionForPrescription(
  doc: { id: string; metadata: unknown },
  appt: { id: string; email: string; countryCode: string },
  doctorId: string,
): Promise<void> {
  const meta = (doc.metadata ?? null) as { exams?: unknown; examTypeIds?: unknown } | null;
  const rawLines =
    typeof meta?.exams === "string" ? meta.exams.split(/\r?\n/) : ([] as string[]);
  const idLines =
    typeof meta?.examTypeIds === "string" ? meta.examTypeIds.split(/\r?\n/) : ([] as string[]);

  // Align ids to lines BEFORE dropping blanks, otherwise a blank line in the
  // textarea shifts every catalogue id onto the wrong exam.
  const exams = rawLines
    .map((line, i) => ({ label: line.trim(), examTypeId: idLines[i]?.trim() || null }))
    .filter((e) => e.label.length > 0);
  if (exams.length === 0) return;

  const patientProfile = await prisma.patientProfile.findUnique({
    where: { email: appt.email },
    select: { id: true },
  });
  // No profile means nothing to attach a requisition to. The prescription PDF
  // still reached the patient; the queue entry appears once they have a record.
  if (!patientProfile) return;

  await createRequisitionFromPrescription({
    patientProfileId: patientProfile.id,
    countryCode: appt.countryCode,
    appointmentId: appt.id,
    doctorId,
    generatedDocumentId: doc.id,
    exams,
  });
}

export async function sendGeneratedDocuments(
  doctorId: string,
  appointmentId: string,
  documentIds: string[],
) {
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, doctorId },
    select: { id: true, fullName: true, email: true, countryCode: true },
  });
  if (!appt) return null;

  const docs = await prisma.generatedDocument.findMany({
    where: {
      id: { in: documentIds },
      appointmentId,
      doctorId,
      sentToPatient: false,
    },
  }).then((rows) => rows.filter((d) => isEmailSendable(d.documentType)));

  let sent = 0;
  const errors: string[] = [];
  for (const doc of docs) {
    const pdfBuffer = await readStorageToBuffer(doc.storageKey);
    if (!pdfBuffer) {
      errors.push(`${doc.fileName}: PDF file missing from storage`);
      continue;
    }
    const meta = (doc.metadata ?? null) as { customLabel?: unknown; certificateName?: unknown } | null;
    const customLabel =
      typeof meta?.customLabel === "string" ? meta.customLabel.trim() : "";
    const certName =
      typeof meta?.certificateName === "string" ? meta.certificateName.trim() : "";
    const documentLabel =
      doc.documentType === "OTHER" && customLabel
        ? customLabel
        : doc.documentType === "CUSTOM_CERTIFICATE" && certName
          ? certName
          : TITLES[doc.documentType];
    const result = await sendGeneratedDocumentEmail({
      to: appt.email,
      patientName: appt.fullName,
      documentType: documentLabel,
      fileName: doc.fileName,
      attachment: {
        filename: doc.fileName,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    });
    if (result.ok && result.mode !== "log") {
      await prisma.generatedDocument.update({
        where: { id: doc.id },
        data: { sentToPatient: true },
      });
      // An exams prescription that actually reached the patient opens a case in
      // the admin lab queue, so someone can ring them and agree what to book.
      // Deliberately on SEND and not on generate: a draft the doctor redraws
      // three times must not queue three times, and an unsent draft is not yet
      // a prescription. Idempotent per document — see the service.
      if (doc.documentType === "EXAMS_PRESCRIPTION") {
        await openLabRequisitionForPrescription(doc, appt, doctorId).catch((err) => {
          // Never let a lab-queue failure look like a failed document send —
          // the patient has the PDF either way.
          console.error("[lab] could not open a requisition for exams prescription", {
            documentId: doc.id,
            err: err instanceof Error ? err.message : err,
          });
        });
      }
      sent += 1;
    } else {
      const detail = !result.ok
        ? result.message
        : result.mode === "log"
          ? "Email not configured — set GMAIL_SEND_FROM + Google OAuth or SENDGRID_API_KEY in backend .env"
          : "Email delivery failed";
      errors.push(`${doc.fileName}: ${detail}`);
    }
  }

  return { sentCount: sent, errors, attempted: docs.length };
}

/**
 * Send an exams prescription's per-prescription upload link to the patient via
 * email + WhatsApp. Reuses the stored v3 token; re-mints + persists if expired.
 */
export async function sendGeneratedDocumentUploadLink(doctorId: string, documentId: string) {
  const doc = await prisma.generatedDocument.findFirst({
    where: { id: documentId, doctorId },
  });
  if (!doc) return { ok: false as const, status: 404, message: "Document not found" };
  if (doc.documentType !== "EXAMS_PRESCRIPTION") {
    return {
      ok: false as const,
      status: 400,
      message: "Upload links are only available for exams prescriptions",
    };
  }

  const appt = await prisma.appointment.findFirst({
    where: { id: doc.appointmentId, doctorId },
    select: { id: true, fullName: true, email: true, phone: true },
  });
  if (!appt) return { ok: false as const, status: 404, message: "Appointment not found" };

  // SEC-006: the raw token is never persisted (only its SHA-256 hash), so a
  // link can't be reconstructed from the stored row. Every resend therefore
  // mints a fresh token — createPatientUploadToken revokes the prior link for
  // this scope — and we store only the new hash.
  const { token, expiresAt } = await createPatientUploadToken({
    email: appt.email,
    appointmentId: appt.id,
    doctorId,
    documentId: doc.id,
  });
  await prisma.generatedDocument.update({
    where: { id: doc.id },
    data: { uploadTokenHash: hashToken(token), uploadTokenExpiresAt: expiresAt },
  });

  const link = buildPatientUploadUrl(token);
  const numberLabel = doc.prescriptionNumber != null ? ` #${doc.prescriptionNumber}` : "";
  const deliveryWarnings: string[] = [];

  try {
    const res = await sendPatientUploadLinkEmail({
      to: appt.email,
      patientName: appt.fullName,
      link,
    });
    if (!res.ok || res.mode === "log") deliveryWarnings.push("email");
  } catch {
    deliveryWarnings.push("email");
  }

  if (appt.phone) {
    try {
      const wa = await sendWhatsAppText({
        to: appt.phone,
        message: `Upload your exam results for prescription${numberLabel} securely:\n${link}`,
      });
      if (!wa.ok && !wa.skipped) deliveryWarnings.push("whatsapp");
    } catch {
      deliveryWarnings.push("whatsapp");
    }
  } else {
    deliveryWarnings.push("no-phone");
  }

  return { ok: true as const, link, expiresAt, deliveryWarnings };
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

/**
 * Mark a medicine prescription as finalized (moves it from Review & send queue
 * to history). No email is sent — prescriptions are for records / national portal.
 */
export async function finalizeGeneratedDocument(doctorId: string, documentId: string) {
  const doc = await prisma.generatedDocument.findFirst({
    where: { id: documentId, doctorId },
  });
  if (!doc) return { ok: false as const, status: 404, message: "Document not found" };
  if (doc.documentType !== "PRESCRIPTION") {
    return { ok: false as const, status: 400, message: "Only medicine prescriptions can be finalized this way" };
  }
  if (doc.sentToPatient) {
    return { ok: false as const, status: 409, message: "Document is already finalized" };
  }
  await prisma.generatedDocument.update({
    where: { id: doc.id },
    data: { sentToPatient: true },
  });
  return { ok: true as const };
}
