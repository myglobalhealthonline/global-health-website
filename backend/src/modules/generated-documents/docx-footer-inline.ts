import type PizZip from "pizzip";
import { buildFooterGapXml } from "./docx-page-layout.js";

/** Standard A4 portrait (integer twips). Custom heights cause a blank 2nd page in LibreOffice. */
const A4_WIDTH_TWIPS = 11909;
const A4_HEIGHT_TWIPS = 16834;

function normalizeSectionProperties(sectPrXml: string): string {
  return sectPrXml
    .replace(/<w:pgSz[^/]*\/>/, `<w:pgSz w:w="${A4_WIDTH_TWIPS}" w:h="${A4_HEIGHT_TWIPS}" w:orient="portrait"/>`)
    .replace(/w:footer="[^"]+"/, 'w:footer="0"')
    .replace(/w:header="[^"]+"/, 'w:header="850"')
    .replace(/w:top="[^"]+"/, 'w:top="1440"')
    .replace(/w:bottom="[^"]+"/, 'w:bottom="720"');
}

/**
 * Footer graphic stays in word/footer1.xml only.
 * Six blank lines before the footer band; full A4 page (no custom page height).
 */
export function applyDocumentFooterLayout(_zip: PizZip, documentXml: string): string {
  const sectIdx = documentXml.indexOf("<w:sectPr");
  if (sectIdx < 0) return documentXml;

  const beforeSect = documentXml.slice(0, sectIdx);
  const sectPr = normalizeSectionProperties(documentXml.slice(sectIdx));
  return beforeSect + buildFooterGapXml() + sectPr;
}
