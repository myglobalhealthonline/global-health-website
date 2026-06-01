import type { GeneratedDocumentType } from "@prisma/client";
import { formatDateDdMmYyyy } from "../generated-documents/document-template-utils.js";

export const GENERATED_DOCUMENT_TYPE_LABELS: Record<GeneratedDocumentType, string> = {
  EXAMS_PRESCRIPTION: "Exams prescription",
  ABSENCE_CERTIFICATE: "Absence certificate",
  PRESCRIPTION: "Medicine prescription",
  OTHER: "Other",
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

/** Human-readable order reference (legacy dashboards showed a short numeric id). */
export function formatOrderRef(appointmentId: string, orderId?: string | null): string {
  if (orderId) {
    const digits = orderId.replace(/\D/g, "");
    if (digits.length >= 4) return digits.slice(-6);
    return orderId.slice(-8).toUpperCase();
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
