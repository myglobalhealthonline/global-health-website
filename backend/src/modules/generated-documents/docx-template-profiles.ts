import type { GeneratedDocumentType } from "@prisma/client";

/** Maps app country codes to template filename prefix in Templates/*.docx */
export const COUNTRY_TO_TEMPLATE_PREFIX: Record<string, string> = {
  ie: "IR",
  ir: "IR",
  pt: "PT",
  sp: "ES",
  es: "ES",
  cz: "CZ",
  rm: "RO",
  ro: "RO",
};

export function templatePrefixForCountry(countryCode: string): string | null {
  return COUNTRY_TO_TEMPLATE_PREFIX[countryCode.toLowerCase().trim()] ?? null;
}

/** Literal placeholder strings baked into the Word templates (use as-is). */
export type DocxLiteralProfile = {
  prefix: string;
  patientName: string;
  birthDate: string;
  address: string;
  consultationDate: string;
  doctorName: string;
  registrationNumber: string;
  /** Label before body area (removed on generate for exams/absence). */
  bodyLeadIn: string;
  /** Keyword that starts the signature block. */
  signatureLeadIn: string;
  /** Prescription-only label before signature. */
  prescriptionLeadIn?: string;
};

export const DOCX_LITERAL_PROFILES: DocxLiteralProfile[] = [
  {
    prefix: "IR",
    patientName: "xxxxxx xxxxx  xxxxxxxx",
    birthDate: "dd/mm/yyyy",
    address: "xxxxxxxxxxxxxxxxxxxxxxxx",
    consultationDate: "XX/XX/XXXX",
    doctorName: "XXXXXXXXXXX",
    registrationNumber: "XXXXXXX",
    bodyLeadIn: "Note:",
    signatureLeadIn: "Prescriber",
    prescriptionLeadIn: "Prescription:",
  },
  {
    prefix: "PT",
    patientName: "xxxxxx xxxxx  xxxxxxxx",
    birthDate: "dd/mm/aaaa",
    address: "xxxxxxxxxxxxxxxxxxxxxxxx",
    consultationDate: "XX/XX/XXXX",
    doctorName: "XXXXXXXXXXX",
    registrationNumber: "XXXXXXX",
    bodyLeadIn: "Nota:",
    signatureLeadIn: "Assinatura",
    prescriptionLeadIn: "Prescrição:",
  },
  {
    prefix: "ES",
    patientName: "xxxxxx xxxxx  xxxxxxxx",
    birthDate: "dd/mm/aaaa",
    address: "xxxxxxxxxxxxxxxxxxxxxxxx",
    consultationDate: "XX/XX/XXXX",
    doctorName: "XXXXXXXXXXX",
    registrationNumber: "XXXXXXX",
    bodyLeadIn: "Nota:",
    signatureLeadIn: "Firma",
    prescriptionLeadIn: "Prescripción:",
  },
  {
    prefix: "CZ",
    patientName: "xxxxxx xxxxx xxxxxxxx",
    birthDate: "dd/mm/rrrr",
    address: "xxxxxxxxxxxxxxxxxxxxxxxxx",
    consultationDate: "XX/XX/XXXX",
    doctorName: "XXXXXXXXXXX",
    registrationNumber: "XXXXXXX",
    bodyLeadIn: "Oznámení:",
    signatureLeadIn: "Podpis",
    prescriptionLeadIn: "Předpis:",
  },
  {
    prefix: "RO",
    patientName: "xxxxxx xxxxx xxxxxxxx",
    birthDate: "zz/ll/aaaa",
    address: "xxxxxxxxxxxxxxxxxxxxxxxx",
    consultationDate: "XX/XX/XXXX",
    doctorName: "XXXXXXXXXXX",
    registrationNumber: "XXXXXXX",
    bodyLeadIn: "Observa:",
    signatureLeadIn: "Semnătura",
    prescriptionLeadIn: "REȚETĂ MEDICALĂ:",
  },
];

export function profileForPrefix(prefix: string): DocxLiteralProfile | null {
  return DOCX_LITERAL_PROFILES.find((p) => p.prefix === prefix) ?? null;
}

export function docxFilename(
  prefix: string,
  documentType: GeneratedDocumentType,
): string | null {
  const typePart =
    documentType === "ABSENCE_CERTIFICATE"
      ? "Absence Certificate Template"
      : documentType === "EXAMS_PRESCRIPTION"
        ? "Exams Template"
        : documentType === "PRESCRIPTION"
          ? "Prescription Template"
          : null;
  if (!typePart) return null;
  return `(${prefix}) ${typePart} _ Global Health.docx`;
}

export function escapeXmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** @deprecated Use buildBodyLines in docx-xml-builder — kept for HTML fallback. */
export function buildBodyContent(
  documentType: GeneratedDocumentType,
  data: Record<string, string>,
): string {
  if (documentType === "EXAMS_PRESCRIPTION") {
    return data.examsNotes ?? "";
  }
  if (documentType === "ABSENCE_CERTIFICATE") {
    const parts: string[] = [];
    if (data.startDate) parts.push(`From: ${data.startDate}`);
    if (data.endDate) parts.push(`To: ${data.endDate}`);
    if (data.reason) parts.push(data.reason);
    return parts.join("\n");
  }
  if (documentType === "PRESCRIPTION") {
    const lines: string[] = [];
    for (let i = 1; i <= 7; i++) {
      const m = data[`medication${i}`]?.trim();
      if (m) lines.push(`${i}. ${m}`);
    }
    return lines.join("\n");
  }
  return data.body ?? "";
}
