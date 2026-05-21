import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { GeneratedDocumentType } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { putObject, deleteObject, isMediaStorageConfigured } from "../../services/object-storage.js";
import { sendGeneratedDocumentEmail } from "../../lib/email/templates.js";

const TITLES: Record<GeneratedDocumentType, string> = {
  ABSENCE_CERTIFICATE: "Medical absence certificate",
  EXAMS_PRESCRIPTION: "Examinations prescription",
  PRESCRIPTION: "Medical prescription",
};

export async function generateAppointmentDocument(input: {
  appointmentId: string;
  doctorId: string;
  documentType: GeneratedDocumentType;
  fields?: Record<string, string>;
}) {
  if (!isMediaStorageConfigured()) {
    throw new Error("Document storage is not configured");
  }

  const appt = await prisma.appointment.findFirst({
    where: { id: input.appointmentId, doctorId: input.doctorId },
    include: {
      doctor: { select: { fullName: true, title: true } },
    },
  });
  if (!appt) return null;

  const pdfBytes = await buildPdf({
    title: TITLES[input.documentType],
    patientName: appt.fullName,
    doctorName: appt.doctor
      ? `${appt.doctor.title} ${appt.doctor.fullName}`.trim()
      : "Global Health",
    date: new Date().toLocaleDateString("en-GB"),
    body: input.fields?.body ?? input.fields?.notes ?? "",
    extras: input.fields ?? {},
  });

  const fileName = `${input.documentType.toLowerCase()}-${appt.id.slice(0, 8)}.pdf`;
  const storageKey = `generated/${input.doctorId}/${appt.id}/${fileName}`;

  await putObject(storageKey, Buffer.from(pdfBytes), "application/pdf");

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

  return row;
}

async function buildPdf(opts: {
  title: string;
  patientName: string;
  doctorName: string;
  date: string;
  body: string;
  extras: Record<string, string>;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let y = 780;

  const draw = (text: string, size: number, useBold = false) => {
    page.drawText(text.slice(0, 90), {
      x: 50,
      y,
      size,
      font: useBold ? bold : font,
      color: rgb(0.1, 0.2, 0.15),
    });
    y -= size + 10;
  };

  draw(opts.title, 18, true);
  draw(`Patient: ${opts.patientName}`, 12);
  draw(`Doctor: ${opts.doctorName}`, 12);
  draw(`Date: ${opts.date}`, 12);
  y -= 8;
  if (opts.body) {
    for (const line of opts.body.split("\n").slice(0, 20)) {
      draw(line, 11);
    }
  }
  for (const [k, v] of Object.entries(opts.extras)) {
    if (k === "body" || k === "notes") continue;
    draw(`${k}: ${v}`, 10);
  }

  return doc.save();
}

export async function listGeneratedDocuments(appointmentId: string, doctorId: string) {
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, doctorId },
    select: { id: true },
  });
  if (!appt) return null;
  return prisma.generatedDocument.findMany({
    where: { appointmentId },
    orderBy: { createdAt: "desc" },
  });
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
    },
  });

  for (const doc of docs) {
    await sendGeneratedDocumentEmail({
      to: appt.email,
      patientName: appt.fullName,
      documentType: TITLES[doc.documentType],
      fileName: doc.fileName,
    });
    await prisma.generatedDocument.update({
      where: { id: doc.id },
      data: { sentToPatient: true },
    });
  }

  return docs.length;
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
