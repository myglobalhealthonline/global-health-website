import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { GeneratedDocumentType } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import {
  putObject,
  deleteObject,
  getObject,
  streamToNodeReadable,
  isMediaStorageConfigured,
} from "../../services/object-storage.js";
import { sendGeneratedDocumentEmail } from "../../lib/email/templates.js";
import { getDoctorRegistrationByCountryCode } from "../doctor-registrations/doctor-registrations.service.js";
import {
  buildAddressLines,
  buildPatientIdLine,
} from "./generated-documents-fields.js";

const TITLES: Record<GeneratedDocumentType, string> = {
  ABSENCE_CERTIFICATE: "Medical absence certificate",
  EXAMS_PRESCRIPTION: "Examinations prescription",
  PRESCRIPTION: "Medical prescription",
  // OTHER falls back to "Document" when no customLabel is passed; the
  // builder + email template prefer fields.customLabel when present.
  OTHER: "Document",
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 50;
const MARGIN_TOP = 780;
const MARGIN_BOTTOM = 60;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

/**
 * pdf-lib's standard fonts use WinAnsi which throws on characters outside
 * Latin-1 (e.g. Portuguese ã, ç, é). We don't bundle a Unicode TTF in this
 * repo, so we normalize the text down to a Latin-1-safe form before drawing:
 * decompose accented characters and drop the diacritics, then drop any
 * remaining non-printable / non-Latin-1 codepoints. Names lose their accent
 * marks but no crash — preferable to a 500 mid-consultation. If full Unicode
 * fidelity is needed, add `@pdf-lib/fontkit` + a Noto TTF and swap `font`.
 */
function toWinAnsiSafe(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\x20-\x7E\n\r\t]/g, "?");
}

function wrapToWidth(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const rawLine of text.split("\n")) {
    if (rawLine === "") {
      out.push("");
      continue;
    }
    const words = rawLine.split(/\s+/);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      const w = font.widthOfTextAtSize(candidate, size);
      if (w <= maxWidth) {
        current = candidate;
        continue;
      }
      if (current) {
        out.push(current);
        current = "";
      }
      // Word itself wider than the column — hard-break by char.
      if (font.widthOfTextAtSize(word, size) > maxWidth) {
        let chunk = "";
        for (const ch of word) {
          const next = chunk + ch;
          if (font.widthOfTextAtSize(next, size) > maxWidth) {
            if (chunk) out.push(chunk);
            chunk = ch;
          } else {
            chunk = next;
          }
        }
        current = chunk;
      } else {
        current = word;
      }
    }
    if (current) out.push(current);
  }
  return out;
}

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

  const doctorName = appt.doctor
    ? [appt.doctor.title, appt.doctor.fullName].filter((s) => Boolean(s?.trim())).join(" ").trim() ||
      "Global Health"
    : "Global Health";

  // Per-country medical registration. PT prescription must print the OM
  // number; BR must print the CRM; etc. If the doctor hasn't been linked
  // for this country yet, the PDF emits a "Registration: not on file"
  // placeholder so the clinician + admin notice the gap before issuing
  // the document to a patient.
  const registration = await getDoctorRegistrationByCountryCode(
    input.doctorId,
    appt.countryCode,
  );
  let registrationLine: string;
  if (registration?.registrationNumber && registration?.chamberEntity) {
    registrationLine = registration.isVerified
      ? `${registration.chamberEntity}: ${registration.registrationNumber}`
      : `${registration.chamberEntity}: ${registration.registrationNumber} (unverified)`;
  } else {
    registrationLine = `Registration (${appt.countryCode}): not on file`;
    console.warn(
      `[generated-documents] missing registration for doctorId=${input.doctorId} country=${appt.countryCode} — PDF emitted with placeholder`,
    );
  }

  // Patient identity + address. Cached PatientProfile keyed by email —
  // these fields are doctor-editable on the chart and patient-editable
  // on /account/profile, so the most-recent value lands on the Rx.
  const patientProfile = await prisma.patientProfile.findUnique({
    where: { email: appt.email.toLowerCase() },
    select: {
      nationalIdNumber: true,
      taxIdNumber: true,
      passportNumber: true,
      addressLine1: true,
      addressLine2: true,
      addressCity: true,
      addressPostalCode: true,
      addressCountryCode: true,
    },
  });

  const patientIdLine = buildPatientIdLine(appt.countryCode, patientProfile);
  const patientAddressLines = patientProfile
    ? buildAddressLines(patientProfile)
    : [];

  // OTHER documents carry their human title in `fields.customLabel`; the
  // enum entry is just a discriminator. Fall back to the static TITLES
  // entry when no customLabel is supplied (defensive — the route
  // validates this, but the service stays robust if a caller bypasses).
  const customLabel = input.fields?.customLabel?.trim();
  const title =
    input.documentType === "OTHER" && customLabel
      ? customLabel
      : TITLES[input.documentType];

  const pdfBytes = await buildPdf({
    title,
    patientName: appt.fullName,
    patientIdLine,
    patientAddressLines,
    doctorName,
    registrationLine,
    date: new Date().toLocaleDateString("en-GB"),
    body: input.fields?.body ?? input.fields?.notes ?? "",
    extras: input.fields ?? {},
  });

  // Filename uses the customLabel slug for OTHER so the patient sees
  // a recognisable file (e.g. "lab-requisition-abc12345.pdf") rather
  // than "other-abc12345.pdf".
  const slugBase =
    input.documentType === "OTHER" && customLabel
      ? customLabel
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 40) || "document"
      : input.documentType.toLowerCase();
  const fileName = `${slugBase}-${appt.id.slice(0, 8)}.pdf`;
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
  /** "NIF: 123…" / "PPS: …" / "Passport: …" — null when no ID on file. */
  patientIdLine: string | null;
  /** Multi-line address. Empty array hides the block. */
  patientAddressLines: string[];
  doctorName: string;
  /** "OM: 12345" / "Registration (PT): not on file" — always present. */
  registrationLine: string;
  date: string;
  body: string;
  extras: Record<string, string>;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = MARGIN_TOP;

  const newPage = () => {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = MARGIN_TOP;
  };

  const draw = (text: string, size: number, useBold = false) => {
    const safe = toWinAnsiSafe(text);
    const lines = wrapToWidth(safe, useBold ? bold : font, size, CONTENT_WIDTH);
    for (const line of lines) {
      if (y < MARGIN_BOTTOM) newPage();
      page.drawText(line, {
        x: MARGIN_X,
        y,
        size,
        font: useBold ? bold : font,
        color: rgb(0.1, 0.2, 0.15),
      });
      y -= size + 6;
    }
  };

  draw(opts.title, 18, true);
  draw(`Patient: ${opts.patientName}`, 12);
  if (opts.patientIdLine) draw(opts.patientIdLine, 11);
  for (const line of opts.patientAddressLines) {
    draw(line, 10);
  }
  y -= 4;
  draw(`Doctor: ${opts.doctorName}`, 12);
  draw(opts.registrationLine, 11);
  draw(`Date: ${opts.date}`, 12);
  y -= 8;
  if (opts.body) draw(opts.body, 11);
  for (const [k, v] of Object.entries(opts.extras)) {
    if (k === "body" || k === "notes" || k === "customLabel") continue;
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
    },
  });

  let sent = 0;
  for (const doc of docs) {
    const pdfBuffer = await readStorageToBuffer(doc.storageKey);
    // Use customLabel from metadata for OTHER docs so the email subject
    // matches what the doctor titled it (e.g. "Lab requisition") rather
    // than the generic "Document" fallback.
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
    // Only mark as sent if the send actually succeeded — otherwise the
    // doctor sees "delivered" but the patient never got it.
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
