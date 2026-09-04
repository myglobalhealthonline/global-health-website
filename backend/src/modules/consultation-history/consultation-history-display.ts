import type { GeneratedDocumentType } from "@prisma/client";
import { formatOrderDisplayId } from "../automation/automation-catalog.js";
import { formatDateDdMmYyyy } from "../generated-documents/document-template-utils.js";

export const GENERATED_DOCUMENT_TYPE_LABELS: Record<GeneratedDocumentType, string> = {
  EXAMS_PRESCRIPTION: "Exams prescription",
  ABSENCE_CERTIFICATE: "Absence certificate",
  PRESCRIPTION: "Medicine prescription",
  OTHER: "Other",
  CUSTOM_CERTIFICATE: "Custom certificate",
  ATTENDANCE_CERTIFICATE: "Attendance certificate",
};

export function formatSessionParts(
  scheduledAt: Date | null | undefined,
  fallbackAt: Date,
): { sessionDate: string; sessionTime: string; sessionIso: string } {
  const d = scheduledAt ?? fallbackAt;
  const sessionIso = d.toISOString();
  const sessionDate = formatDateDdMmYyyy(d);
  const sessionTime = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return { sessionDate, sessionTime, sessionIso };
}

/** Human-readable order reference. */
export function formatOrderRef(
  appointmentId: string,
  order?: { id: string; orderNumber?: string | null } | string | null,
): string {
  if (order && typeof order === "object") {
    return formatOrderDisplayId(order);
  }
  if (typeof order === "string") {
    return formatOrderDisplayId(order);
  }
  const fromAppt = appointmentId.replace(/\D/g, "");
  if (fromAppt.length >= 4) return fromAppt.slice(-6);
  return appointmentId.slice(-6).toUpperCase();
}

export function formatConsultationTypeLabel(raw: string | null | undefined): string {
  if (!raw?.trim()) return "—";
  const t = raw.trim();
  const lower = t.toLowerCase();
  if (lower.startsWith("ie") || lower.includes("referral")) {
    const cleaned = t
      .replace(/^ie[\s_-]*/i, "")
      .replace(/[-_]/g, " ")
      .trim();
    const tail = cleaned
      ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
      : "Referral consultation";
    return `IE - ${tail}`;
  }
  return t
    .replace(/[-_]/g, " ")
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * What the doctor booked, by name — the catalogue Service ("General
 * Practitioner Consultation"), else the OrderItem name snapshot (survives
 * service deletion / renames), else the coarse `consultationType` label
 * ("General") so legacy rows with neither still render something.
 */
export function resolveConsultationName(
  serviceName: string | null | undefined,
  orderItemName: string | null | undefined,
  consultationType: string | null | undefined,
): string {
  if (serviceName?.trim()) return serviceName.trim();
  if (orderItemName?.trim()) return orderItemName.trim();
  return formatConsultationTypeLabel(consultationType);
}

export function uploadFileTypeLabel(mimetype: string): string {
  const m = mimetype.toLowerCase();
  if (m.includes("pdf")) return "PDF";
  if (m.startsWith("image/")) return "Image";
  return "Others";
}

export function generatedDocumentTitle(
  documentType: GeneratedDocumentType,
  fileName: string,
  metadata: unknown,
): string {
  if (documentType === "OTHER") {
    const meta = metadata as { customLabel?: unknown } | null;
    if (meta && typeof meta.customLabel === "string" && meta.customLabel.trim()) {
      return meta.customLabel.trim();
    }
    return fileName || "Document";
  }
  return fileName || GENERATED_DOCUMENT_TYPE_LABELS[documentType];
}
