import type PizZip from "pizzip";
import { buildLineGapXml, FOOTER_GAP_LINES, LINE_TWIPS } from "./docx-page-layout.js";

/** Standard A4 portrait (integer twips). Custom heights cause a blank 2nd page in LibreOffice. */
const A4_WIDTH_TWIPS = 11909;
const A4_HEIGHT_TWIPS = 16834;

const BODY_FONT = process.platform === "win32" ? "Calibri" : "Carlito";
const BRAND_COLOR = "1D4B36";

function normalizeSectionProperties(sectPrXml: string): string {
  return sectPrXml
    .replace(/<w:pgSz[^/]*\/>/, `<w:pgSz w:w="${A4_WIDTH_TWIPS}" w:h="${A4_HEIGHT_TWIPS}" w:orient="portrait"/>`)
    .replace(/w:footer="[^"]+"/, 'w:footer="0"')
    .replace(/w:header="[^"]+"/, 'w:header="850"')
    .replace(/w:top="[^"]+"/, 'w:top="1440"')
    .replace(/w:bottom="[^"]+"/, 'w:bottom="720"');
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildAddressLinePara(text: string): string {
  const SIZE_HP = "18"; // 9pt
  return (
    `<w:p><w:pPr><w:jc w:val="center"/>` +
    `<w:spacing w:before="0" w:after="0" w:line="${LINE_TWIPS}" w:lineRule="exact"/></w:pPr>` +
    `<w:r><w:rPr>` +
    `<w:rFonts w:ascii="${BODY_FONT}" w:hAnsi="${BODY_FONT}" w:cs="${BODY_FONT}"/>` +
    `<w:sz w:val="${SIZE_HP}"/><w:szCs w:val="${SIZE_HP}"/>` +
    `<w:color w:val="${BRAND_COLOR}"/>` +
    `</w:rPr><w:t>${escapeXml(text)}</w:t></w:r></w:p>`
  );
}

/**
 * Footer graphic stays in word/footer1.xml only.
 * Blank lines before the footer band; full A4 page (no custom page height).
 * When countryAddress is provided, the last blank line is replaced by a small
 * address paragraph so total visual height stays the same.
 */
export function applyDocumentFooterLayout(
  _zip: PizZip,
  documentXml: string,
  countryAddress?: string,
): string {
  const sectIdx = documentXml.indexOf("<w:sectPr");
  if (sectIdx < 0) return documentXml;

  const beforeSect = documentXml.slice(0, sectIdx);
  const sectPr = normalizeSectionProperties(documentXml.slice(sectIdx));

  const gap = countryAddress
    ? buildLineGapXml(FOOTER_GAP_LINES - 1) + buildAddressLinePara(countryAddress)
    : buildLineGapXml(FOOTER_GAP_LINES);

  return beforeSect + gap + sectPr;
}
