import type { GeneratedDocumentType } from "@prisma/client";

export const TEMPLATE_FILE_BY_TYPE: Record<GeneratedDocumentType, string> = {
  EXAMS_PRESCRIPTION: "exams-prescription.html",
  ABSENCE_CERTIFICATE: "absence-certificate.html",
  PRESCRIPTION: "prescription.html",
  OTHER: "other.html",
  CUSTOM_CERTIFICATE: "custom-certificate.html",
  ATTENDANCE_CERTIFICATE: "attendance-certificate.html",
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

/** Document types that appear in Review & Send queue until emailed/finalized. */
export const REVIEW_QUEUE_TYPES: GeneratedDocumentType[] = [
  "EXAMS_PRESCRIPTION",
  "ABSENCE_CERTIFICATE",
  "PRESCRIPTION",
  "OTHER",
  "CUSTOM_CERTIFICATE",
  "ATTENDANCE_CERTIFICATE",
];

/** Subset of review queue documents that can be emailed to the patient. */
export const EMAIL_SEND_QUEUE_TYPES: GeneratedDocumentType[] = [
  "EXAMS_PRESCRIPTION",
  "ABSENCE_CERTIFICATE",
  "OTHER",
  "CUSTOM_CERTIFICATE",
  "ATTENDANCE_CERTIFICATE",
];

export function isInReviewQueue(documentType: GeneratedDocumentType, sentToPatient: boolean): boolean {
  return REVIEW_QUEUE_TYPES.includes(documentType) && sentToPatient === false;
}

export function isEmailSendable(documentType: GeneratedDocumentType): boolean {
  return EMAIL_SEND_QUEUE_TYPES.includes(documentType);
}

/**
 * Markets where the medicine prescription PDF may also be emailed straight to
 * the patient. Everywhere else a PRESCRIPTION stays a doctor's-records +
 * national-portal document and is finalized rather than sent.
 *
 * Both code spellings are listed on purpose: this app stores Spain as `sp` and
 * Romania as `rm`, while ISO `es`/`ro` show up in imported/legacy rows.
 */
export const PRESCRIPTION_EMAIL_COUNTRIES = ["cz", "sp", "es", "rm", "ro"];

export function isPrescriptionEmailCountry(countryCode: string | null | undefined): boolean {
  return PRESCRIPTION_EMAIL_COUNTRIES.includes((countryCode ?? "").toLowerCase().trim());
}

/** Country-aware form of `isEmailSendable` — use this on any real send path. */
export function isEmailSendableForCountry(
  documentType: GeneratedDocumentType,
  countryCode: string | null | undefined,
): boolean {
  if (isEmailSendable(documentType)) return true;
  return documentType === "PRESCRIPTION" && isPrescriptionEmailCountry(countryCode);
}

/** Documents appear in history once sent or (for PRESCRIPTION) once finalized. */
export function isVisibleInHistory(
  documentType: GeneratedDocumentType,
  sentToPatient: boolean,
): boolean {
  return sentToPatient === true;
}
