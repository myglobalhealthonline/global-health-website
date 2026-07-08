import type { GeneratedDocumentType } from "@prisma/client";
import { escapeXmlText, type DocxLiteralProfile } from "./docx-template-profiles.js";
import { labelsForPrefix, type TemplateLabels } from "./docx-template-labels.js";
import {
  buildPatientBodyGapXml,
  buildSignatureBlockGapXml,
  FONT_SIZE_BODY_HP,
  LINE_TWIPS,
} from "./docx-page-layout.js";
import { SIGNATURE_FONT } from "./docx-alex-brush-font.js";

/** Global Health brand — forest green (Word hex without #). */
const BRAND_COLOR = "1D4B36";
const MUTED_COLOR = "4A4A4A";
/** Calibri ships with Word/LibreOffice; renders consistently in PDF export. */
const FONT = process.platform === "win32" ? "Calibri" : "Carlito";
const SIZE_BODY = String(FONT_SIZE_BODY_HP); // 17pt
const SIZE_SIGNATURE = "36"; // 18pt Alex Brush signature

type RunOpts = { bold?: boolean; color?: string; size?: string; font?: string };

function runXml(text: string, opts: RunOpts = {}): string {
  const safe = escapeXmlText(text);
  const fontName = opts.font ?? FONT;
  const rPr: string[] = [
    `<w:rFonts w:ascii="${fontName}" w:hAnsi="${fontName}" w:cs="${fontName}"/>`,
    `<w:sz w:val="${opts.size ?? SIZE_BODY}"/>`,
    `<w:szCs w:val="${opts.size ?? SIZE_BODY}"/>`,
  ];
  if (opts.bold) {
    rPr.push(`<w:b w:val="1"/>`, `<w:bCs w:val="1"/>`);
  }
  if (opts.color) {
    rPr.push(`<w:color w:val="${opts.color}"/>`);
  }
  return (
    `<w:r><w:rPr>${rPr.join("")}<w:rtl w:val="0"/></w:rPr>` +
    `<w:t xml:space="preserve">${safe}</w:t></w:r>`
  );
}

type ParaOpts = {
  after?: number;
  before?: number;
  indent?: number;
  borderBottom?: boolean;
  keepNext?: boolean;
};

function paragraphXml(runs: string, opts: ParaOpts = {}): string {
  const pPr: string[] = [
    `<w:spacing w:before="${opts.before ?? 0}" w:after="${opts.after ?? 68}" w:line="${LINE_TWIPS}" w:lineRule="auto"/>`,
    `<w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}"/><w:sz w:val="${SIZE_BODY}"/><w:szCs w:val="${SIZE_BODY}"/></w:rPr>`,
  ];
  if (opts.keepNext) {
    pPr.push(`<w:keepNext w:val="1"/><w:keepLines w:val="1"/>`);
  }
  if (opts.indent) {
    pPr.push(`<w:ind w:left="${opts.indent}"/>`);
  }
  if (opts.borderBottom) {
    pPr.push(
      `<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="D0D0D0"/></w:pBdr>`,
    );
  }
  return `<w:p><w:pPr>${pPr.join("")}</w:pPr>${runs}</w:p>`;
}

/** Bold forest-green label + regular value on one line. */
export function buildLabelValueLine(
  label: string,
  value: string,
  opts?: { after?: number; before?: number; keepNext?: boolean },
): string {
  const val = value.trim() || "—";
  return paragraphXml(
    runXml(`${label}: `, { bold: true, color: BRAND_COLOR }) + runXml(val, { color: MUTED_COLOR }),
    { after: opts?.after ?? 50, before: opts?.before ?? 0, keepNext: opts?.keepNext },
  );
}

export function buildSectionTitle(text: string): string {
  return paragraphXml(runXml(text, { bold: true, color: BRAND_COLOR, size: SIZE_BODY }), {
    before: 0,
    after: 60,
  });
}

export function buildContentLine(text: string, indent = 0): string {
  return paragraphXml(runXml(text, { color: MUTED_COLOR }), {
    after: 50,
    indent: indent ? 360 : 0,
  });
}

/** Prescriber signature line with doctor name in Alex Brush (after registration). */
export function buildPrescriberSignatureLine(labels: TemplateLabels, doctorName: string): string {
  const name = doctorName.trim() || "—";
  return paragraphXml(
    runXml(`${labels.signatureLine}: `, { bold: true, color: BRAND_COLOR }) +
      signatureScriptRunXml(name),
    { before: 0, after: 0, keepNext: true },
  );
}

function signatureScriptRunXml(text: string): string {
  const safe = escapeXmlText(text);
  return (
    `<w:r><w:rPr>` +
    `<w:rFonts w:ascii="${SIGNATURE_FONT}" w:hAnsi="${SIGNATURE_FONT}" w:cs="${SIGNATURE_FONT}" w:hint="eastAsia"/>` +
    `<w:sz w:val="${SIZE_SIGNATURE}"/><w:szCs w:val="${SIZE_SIGNATURE}"/>` +
    `<w:i w:val="0"/>` +
    `<w:color w:val="${MUTED_COLOR}"/><w:rtl w:val="0"/>` +
    `</w:rPr><w:t xml:space="preserve">${safe}</w:t></w:r>`
  );
}

function buildPatientTableXml(prefix: string, data: Record<string, string>): string {
  const L = labelsForPrefix(prefix);
  const rows = [
    buildLabelValueLine(L.patientName, data.patientName ?? ""),
    buildLabelValueLine(L.birthDate, data.birthDate ?? ""),
    buildLabelValueLine(L.address, data.address ?? ""),
    buildLabelValueLine(L.consultationDate, data.consultationDate ?? "", { after: 40 }),
  ].join("");

  return (
    `<w:tbl><w:tblPr>` +
    `<w:tblW w:w="5000" w:type="pct"/>` +
    `<w:tblLayout w:type="fixed"/>` +
    `<w:tblBorders>` +
    `<w:top w:val="single" w:sz="6" w:space="0" w:color="${BRAND_COLOR}"/>` +
    `<w:left w:val="single" w:sz="6" w:space="0" w:color="${BRAND_COLOR}"/>` +
    `<w:bottom w:val="single" w:sz="6" w:space="0" w:color="${BRAND_COLOR}"/>` +
    `<w:right w:val="single" w:sz="6" w:space="0" w:color="${BRAND_COLOR}"/>` +
    `<w:insideH w:val="nil"/><w:insideV w:val="nil"/>` +
    `</w:tblBorders>` +
    `<w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:left w:w="140" w:type="dxa"/>` +
    `<w:bottom w:w="80" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tblCellMar>` +
    `</w:tblPr>` +
    `<w:tblGrid><w:gridCol w:w="9026"/></w:tblGrid>` +
    `<w:tr><w:tc><w:tcPr><w:tcW w:w="9026" w:type="dxa"/></w:tcPr>${rows}</w:tc></w:tr>` +
    `</w:tbl>`
  );
}

function buildSignatureBlockXml(prefix: string, data: Record<string, string>): string {
  const L = labelsForPrefix(prefix);
  const tight = { after: 0, keepNext: true };
  return (
    buildSignatureBlockGapXml() +
    [
      buildLabelValueLine(L.doctorName, data.doctorName ?? "", tight),
      buildLabelValueLine(L.registration, data.registrationNumber ?? "", tight),
      buildPrescriberSignatureLine(L, data.doctorName ?? ""),
    ].join("")
  );
}

export function buildAbsenceBodyXml(prefix: string, data: Record<string, string>): string {
  const L = labelsForPrefix(prefix);
  const parts = [buildSectionTitle(L.absenceTitle)];
  if (data.startDate?.trim()) {
    parts.push(buildLabelValueLine(L.from, data.startDate.trim()));
  }
  if (data.endDate?.trim()) {
    parts.push(buildLabelValueLine(L.to, data.endDate.trim()));
  }
  if (data.reason?.trim()) {
    parts.push(buildLabelValueLine(L.reason, data.reason.trim(), { after: 60 }));
  }
  return parts.join("");
}

export function buildExamsBodyXml(data: Record<string, string>, prefix: string): string {
  const L = labelsForPrefix(prefix);
  const parts = [buildSectionTitle(L.examsTitle)];
  if (data.exams?.trim()) {
    for (const line of data.exams.split(/\r?\n/)) {
      const t = line.trim();
      if (t) parts.push(buildContentLine(`• ${t}`, 0));
    }
  }
  const notes = data.notes?.trim();
  if (notes) {
    parts.push(buildLabelValueLine(L.additionalNotes, notes, { after: 60 }));
  }
  if (parts.length === 1 && data.examsNotes?.trim()) {
    for (const line of data.examsNotes.split(/\r?\n/)) {
      const t = line.trim();
      if (t) parts.push(buildContentLine(`• ${t}`));
    }
  }
  return parts.join("");
}

export function buildPrescriptionBodyXml(data: Record<string, string>, prefix: string): string {
  const L = labelsForPrefix(prefix);
  const parts = [buildSectionTitle(L.prescriptionTitle)];
  for (let i = 1; i <= 7; i++) {
    const m = data[`medication${i}`]?.trim();
    if (m) parts.push(buildContentLine(`${i}. ${m}`));
  }
  if (data.pharmacy?.trim()) {
    parts.push(buildLabelValueLine(L.pharmacy, data.pharmacy.trim(), { after: 60 }));
  }
  return parts.join("");
}

function buildBodyXml(
  documentType: GeneratedDocumentType,
  prefix: string,
  data: Record<string, string>,
): string {
  if (documentType === "ABSENCE_CERTIFICATE") {
    return buildAbsenceBodyXml(prefix, data);
  }
  if (documentType === "EXAMS_PRESCRIPTION") {
    return buildExamsBodyXml(data, prefix);
  }
  if (documentType === "PRESCRIPTION") {
    return buildPrescriptionBodyXml(data, prefix);
  }
  const body = data.body?.trim();
  if (!body) return "";
  return body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => buildContentLine(l))
    .join("");
}

/** Opening `<w:p` only — not `<w:pPr`, `<w:pStyle`, etc. */
function findParagraphStart(xml: string, indexInParagraph: number): number {
  const before = xml.slice(0, indexInParagraph);
  let searchFrom = before.length;
  while (searchFrom > 0) {
    const idx = before.lastIndexOf("<w:p", searchFrom - 1);
    if (idx < 0) break;
    const next = before.charAt(idx + 4);
    if (next === " " || next === ">") return idx;
    searchFrom = idx;
  }
  return indexInParagraph;
}

/**
 * Replace legacy template body (patient fields through signature) with
 * branded layout: bordered patient table, section body, signature block.
 */
export function injectProfessionalLayout(
  xml: string,
  profile: DocxLiteralProfile,
  documentType: GeneratedDocumentType,
  data: Record<string, string>,
): string {
  const patientIdx = xml.indexOf(profile.patientName);
  if (patientIdx < 0) return xml;

  const patientStart = findParagraphStart(xml, patientIdx);
  const sigIdx = xml.indexOf(profile.signatureLeadIn);
  if (sigIdx < 0) return xml;

  const sectIdx = xml.indexOf("<w:sectPr");

  const patientXml = buildPatientTableXml(profile.prefix, data);
  const bodyXml = buildBodyXml(documentType, profile.prefix, data);
  const signatureXml = buildSignatureBlockXml(profile.prefix, data);

  const head = trimLeadingEmptyParagraphs(xml.slice(0, patientStart));
  const tail = sectIdx >= 0 ? xml.slice(sectIdx) : "";

  const body =
    trimLeadingEmptyParagraphs(head) +
    patientXml +
    buildPatientBodyGapXml() +
    bodyXml +
    signatureXml;
  return body + tail;
}

/** Remove empty paragraphs at the start of w:body (legacy template spacing). */
export function trimBodyLeadingEmptyParagraphs(documentXml: string): string {
  const bodyTag = "<w:body>";
  const bodyIdx = documentXml.indexOf(bodyTag);
  if (bodyIdx < 0) return documentXml;
  const innerStart = bodyIdx + bodyTag.length;
  const sectIdx = documentXml.indexOf("<w:sectPr", innerStart);
  const innerEnd = sectIdx >= 0 ? sectIdx : documentXml.length;
  const trimmed = trimLeadingEmptyParagraphs(documentXml.slice(innerStart, innerEnd));
  return documentXml.slice(0, innerStart) + trimmed + documentXml.slice(innerEnd);
}

function trimLeadingEmptyParagraphs(head: string): string {
  let trimmed = head;
  for (;;) {
    const m = trimmed.match(/^<w:p[\s>][\s\S]*?<\/w:p>/);
    if (!m) break;
    const hasText = /<w:t[^>]*>[^<\s]/.test(m[0]);
    const hasDrawing = /<w:drawing>/.test(m[0]);
    if (hasText || hasDrawing) break;
    trimmed = trimmed.slice(m[0].length);
  }
  return trimmed;
}

/** @deprecated — use injectProfessionalLayout */
export function stripBoldFromDocumentXml(xml: string): string {
  return xml
    .replace(/<w:b w:val="1"\/>/g, "")
    .replace(/<w:bCs w:val="1"\/>/g, "");
}

/** @deprecated — use injectProfessionalLayout */
export function buildWordParagraph(text: string): string {
  return buildContentLine(text);
}

export function buildAbsenceBodyLines(prefix: string, data: Record<string, string>): string[] {
  const L = labelsForPrefix(prefix);
  const lines: string[] = [];
  if (data.startDate?.trim()) lines.push(`${L.from}: ${data.startDate.trim()}`);
  if (data.endDate?.trim()) lines.push(`${L.to}: ${data.endDate.trim()}`);
  if (data.reason?.trim()) lines.push(`${L.reason}: ${data.reason.trim()}`);
  return lines;
}

export function buildExamsBodyLines(data: Record<string, string>): string[] {
  const lines: string[] = [];
  if (data.exams?.trim()) {
    for (const line of data.exams.split(/\r?\n/)) {
      const t = line.trim();
      if (t) lines.push(t);
    }
  }
  if (data.notes?.trim()) lines.push(data.notes.trim());
  return lines;
}

export function buildPrescriptionBodyLines(data: Record<string, string>): string[] {
  const lines: string[] = [];
  for (let i = 1; i <= 7; i++) {
    const m = data[`medication${i}`]?.trim();
    if (m) lines.push(`${i}. ${m}`);
  }
  return lines;
}

export function injectBodyBeforeSignature(
  xml: string,
  profile: DocxLiteralProfile,
  documentType: GeneratedDocumentType,
  bodyLines: string[],
): string {
  void profile;
  void documentType;
  void bodyLines;
  return xml;
}

export function buildBodyLines(
  documentType: GeneratedDocumentType,
  prefix: string,
  data: Record<string, string>,
): string[] {
  if (documentType === "ABSENCE_CERTIFICATE") {
    return buildAbsenceBodyLines(prefix, data);
  }
  if (documentType === "EXAMS_PRESCRIPTION") {
    return buildExamsBodyLines(data);
  }
  if (documentType === "PRESCRIPTION") {
    return buildPrescriptionBodyLines(data);
  }
  const body = data.body?.trim();
  return body ? body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean) : [];
}
