export const GENERATED_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  EXAMS_PRESCRIPTION: "Exams prescription",
  ABSENCE_CERTIFICATE: "Absence certificate",
  PRESCRIPTION: "Medicine prescription",
  OTHER: "Other",
  CUSTOM_CERTIFICATE: "Custom certificate",
  ATTENDANCE_CERTIFICATE: "Attendance certificate",
};

export function formatOrderRef(appointmentId: string, orderRef?: string | null): string {
  if (orderRef?.trim()) {
    const trimmed = orderRef.trim();
    if (trimmed.startsWith("ORD-")) return trimmed;
    return trimmed.slice(-8).toUpperCase();
  }
  const fromAppt = appointmentId.replace(/\D/g, "");
  if (fromAppt.length >= 4) return fromAppt.slice(-6);
  return appointmentId.slice(-6).toUpperCase();
}

export function formatSessionParts(
  scheduledAt: string | null | undefined,
  fallbackAt: string,
): { sessionDate: string; sessionTime: string } {
  const iso = scheduledAt ?? fallbackAt;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { sessionDate: "—", sessionTime: "—" };
  }
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const sessionDate = `${day}/${month}/${year}`;
  const sessionTime = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return { sessionDate, sessionTime };
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
  documentType: string,
  fileName: string,
  metadata?: Record<string, string> | null,
): string {
  if (documentType === "OTHER") {
    const label = metadata?.customLabel?.trim();
    if (label) return label;
    return fileName || "Document";
  }
  return fileName || GENERATED_DOCUMENT_TYPE_LABELS[documentType] || documentType;
}
