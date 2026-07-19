import type PizZip from "pizzip";
import { buildLineGapXml, FOOTER_GAP_LINES } from "./docx-page-layout.js";
import { clinicAddressLines } from "../../lib/clinic-addresses.js";

const COUNTRY_LEGAL_TEXTS: Partial<Record<string, { text: string; szHp: string }>> = {
  CZ: {
    text: "Global Health je obchodní značkou společnosti Global Guest s.r.o., poskytovatele zdravotních služeb zapsaného v Národním registru poskytovatelů zdravotních služeb (NRPZS) pod registračním číslem 19071680.",
    szHp: "14", // 7pt
  },
  PT: {
    text: "A Global Health é uma marca comercial da Global Guest s.r.o., entidade prestadora de cuidados de saúde registada na Entidade Reguladora da Saúde (ERS) sob o número 179287.",
    szHp: "14", // 7pt
  },
};

/**
 * Returns a small body paragraph with the country-specific legal registration text
 * for CZ (NRPZS) and PT (ERS). Returns empty string for all other countries.
 * Inject this into document.xml just before <w:sectPr> so it sits above the footer band.
 */
export function buildCountryLegalParagraphXml(countryCode: string): string {
  const cfg = COUNTRY_LEGAL_TEXTS[countryCode.toUpperCase()];
  if (!cfg) return "";
  const { text, szHp } = cfg;
  const FONT = process.platform === "win32" ? "Calibri" : "Carlito";
  const rPr =
    `<w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:cs="${FONT}"/>` +
    `<w:sz w:val="${szHp}"/><w:szCs w:val="${szHp}"/>` +
    `<w:color w:val="4A4A4A"/><w:rtl w:val="0"/>`;
  return (
    `<w:p><w:pPr>` +
    `<w:spacing w:before="60" w:after="0" w:line="220" w:lineRule="auto"/>` +
    `<w:jc w:val="left"/>` +
    `<w:rPr>${rPr}</w:rPr></w:pPr>` +
    `<w:r><w:rPr>${rPr}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>` +
    `</w:p>`
  );
}

/** Standard A4 portrait (integer twips). Custom heights cause a blank 2nd page in LibreOffice. */
const A4_WIDTH_TWIPS = 11909;
const A4_HEIGHT_TWIPS = 16834;

const BODY_FONT = process.platform === "win32" ? "Calibri" : "Carlito";

/**
 * Footer band starts at ~14771 twips (261mm) from page top (A4 height minus 36mm image).
 * The address frame is placed ~mid-band so white text appears visibly inside the green band.
 *
 * IR — single line; PT — 4 lines (OOXML line breaks within one frame paragraph).
 * x ≈ 6300 twips (just past the page centre, in the right-side contacts area).
 * y ≈ 15500 twips (≈ 273mm from top, ≈ 12mm into the 36mm footer band).
 */
const COUNTRY_FRAME_ADDRESSES: Record<
  string,
  { lines: readonly string[]; x: number; y: number; szHp: string }
> = {
  // IR = the DOCX template prefix for Ireland; also the fallback frame
  // position/size used for any country without its own footer overlay.
  IR: {
    lines: clinicAddressLines("IE"),
    x: 6300,
    y: 15500,
    szHp: "14", // 7pt
  },
  IE: {
    lines: clinicAddressLines("IE"),
    x: 6300,
    y: 15500,
    szHp: "14", // 7pt
  },
  CZ: {
    lines: clinicAddressLines("CZ"),
    x: 6300,
    y: 15500,
    szHp: "14", // 7pt
  },
  PT: {
    lines: [...clinicAddressLines("PT"), "Tel.: 919990810"],
    x: 6300,
    y: 15300,
    szHp: "13", // 6.5pt
  },
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Build a page-anchored frame paragraph (absolutely positioned, no text flow impact)
 * that places white address text inside the footer band. Unmapped/unknown
 * countries fall back to the IR frame position with the Ireland address —
 * every generated document must show a clinic address, never a blank one.
 */
export function buildCountryAddressFrameXml(countryCode: string): string {
  const cfg = COUNTRY_FRAME_ADDRESSES[countryCode.toUpperCase()] ?? COUNTRY_FRAME_ADDRESSES.IR;

  const { lines, x, y, szHp } = cfg;
  // Width: ~47mm — enough for the longest line without overflowing the right margin.
  const W = 2700;
  const rPr =
    `<w:rFonts w:ascii="${BODY_FONT}" w:hAnsi="${BODY_FONT}" w:cs="${BODY_FONT}"/>` +
    `<w:sz w:val="${szHp}"/><w:szCs w:val="${szHp}"/>` +
    `<w:color w:val="FFFFFF"/><w:rtl w:val="0"/>`;
  const framePr =
    `<w:framePr w:w="${W}" w:hSpace="0" w:vSpace="0"` +
    ` w:wrap="none" w:hAnchor="page" w:vAnchor="page"` +
    ` w:x="${x}" w:y="${y}"/>`;

  const runs: string[] = [];
  lines.forEach((line, i) => {
    if (i > 0) {
      // line break between subsequent lines
      runs.push(`<w:r><w:rPr>${rPr}</w:rPr><w:br w:type="textWrapping"/></w:r>`);
    }
    runs.push(
      `<w:r><w:rPr>${rPr}</w:rPr><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r>`,
    );
  });

  return (
    `<w:p><w:pPr>${framePr}` +
    `<w:spacing w:before="0" w:after="0" w:line="200" w:lineRule="exact"/>` +
    `<w:jc w:val="left"/>` +
    `<w:rPr>${rPr}</w:rPr></w:pPr>` +
    runs.join("") +
    `</w:p>`
  );
}

function normalizeSectionProperties(sectPrXml: string): string {
  return sectPrXml
    .replace(
      /<w:pgSz[^/]*\/>/,
      `<w:pgSz w:w="${A4_WIDTH_TWIPS}" w:h="${A4_HEIGHT_TWIPS}" w:orient="portrait"/>`,
    )
    .replace(/w:footer="[^"]+"/, 'w:footer="0"')
    .replace(/w:header="[^"]+"/, 'w:header="850"')
    .replace(/w:top="[^"]+"/, 'w:top="1440"')
    .replace(/w:bottom="[^"]+"/, 'w:bottom="720"');
}

/**
 * Footer graphic stays in word/footer1.xml only.
 * Inserts blank gap lines before the footer band; full A4 page size.
 * Pass gapLines to override the default (e.g. 2 when a compact QR is already present).
 */
export function applyDocumentFooterLayout(
  _zip: PizZip,
  documentXml: string,
  gapLines?: number,
): string {
  const sectIdx = documentXml.indexOf("<w:sectPr");
  if (sectIdx < 0) return documentXml;

  const beforeSect = documentXml.slice(0, sectIdx);
  const sectPr = normalizeSectionProperties(documentXml.slice(sectIdx));
  const gap = buildLineGapXml(gapLines ?? FOOTER_GAP_LINES);
  return beforeSect + gap + sectPr;
}
