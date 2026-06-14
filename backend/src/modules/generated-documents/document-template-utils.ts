import type { GeneratedDocumentType } from "@prisma/client";

export const TEMPLATE_FILE_BY_TYPE: Record<GeneratedDocumentType, string> = {
  EXAMS_PRESCRIPTION: "exams-prescription.html",
  ABSENCE_CERTIFICATE: "absence-certificate.html",
  PRESCRIPTION: "prescription.html",
  OTHER: "other.html",
};

/** Join newline-separated exams with ", " and append optional notes (spec). */
export function formatExamsNotes(exams: string | undefined, notes: string | undefined): string {
  const lines = (exams ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const combined = lines.join(", ");
  const notePart = (notes ?? "").trim();
  if (!combined && !notePart) return "";
  if (!notePart) return combined;
  if (!combined) return notePart;
  return `${combined}  ${notePart}`;
}

export function formatDateDdMmYyyy(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export const DEFAULT_DATA_PROTECTION_LAW = "GDPR";

/**
 * Default reason printed on absence certificates when the doctor leaves the
 * field blank. The data-protection law name is country-configurable via
 * CountryLegalProfile.dataProtectionLawName (e.g. "LGPD" for Brazil);
 * falls back to GDPR when the country has no legal profile.
 */
export function absenceDefaultReason(dataProtectionLawName?: string | null): string {
  const law = (dataProtectionLawName ?? "").trim() || DEFAULT_DATA_PROTECTION_LAW;
  return `Medical Confidentiality (${law})`;
}

export const ABSENCE_DEFAULT_REASON = absenceDefaultReason();

/** Document types that appear in Review & Send queue until emailed to the patient. */
export const REVIEW_QUEUE_TYPES: GeneratedDocumentType[] = [
  "EXAMS_PRESCRIPTION",
  "ABSENCE_CERTIFICATE",
  "PRESCRIPTION",
  "OTHER",
];

export function isInReviewQueue(documentType: GeneratedDocumentType, sentToPatient: boolean): boolean {
  return REVIEW_QUEUE_TYPES.includes(documentType) && sentToPatient === false;
}

/** Sent documents appear in appointment/patient history lists. */
export function isVisibleInHistory(
  documentType: GeneratedDocumentType,
  sentToPatient: boolean,
): boolean {
  void documentType;
  return sentToPatient === true;
}
