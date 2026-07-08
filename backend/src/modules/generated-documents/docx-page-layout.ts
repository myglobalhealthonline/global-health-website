/** Body text 17pt (half-points). */
export const FONT_SIZE_BODY_HP = 34;

/** Single-line spacing in twips for 17pt body. */
export const LINE_TWIPS = 340;

/** Gap between patient info box and main document section (all templates). */
export const PATIENT_BODY_GAP_LINES = 2;

/** Blank lines between main body content and doctor / signature block. */
export const SIGNATURE_BLOCK_GAP_LINES = 2;

/** Blank lines between signature line and the green footer band. */
export const FOOTER_GAP_LINES = 4;

export const FOOTER_GAP_TWIPS = LINE_TWIPS * FOOTER_GAP_LINES;

const EMU_TO_TWIPS = 1440 / 914400;

const MIN_PAGE_HEIGHT_TWIPS = 6000;
const MAX_PAGE_HEIGHT_TWIPS = 16834; // A4

export function emuToTwips(emu: number): number {
  return Math.round(emu * EMU_TO_TWIPS);
}

/** Body font for spacing paragraphs (must match docx-xml-builder). */
const BODY_FONT = process.platform === "win32" ? "Calibri" : "Carlito";

/** Empty paragraphs with exact single-line height. */
export function buildLineGapXml(lineCount: number): string {
  const linePara =
    `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="${LINE_TWIPS}" w:lineRule="exact"/>` +
    `<w:rPr><w:rFonts w:ascii="${BODY_FONT}" w:hAnsi="${BODY_FONT}"/><w:sz w:val="${FONT_SIZE_BODY_HP}"/><w:szCs w:val="${FONT_SIZE_BODY_HP}"/></w:rPr></w:pPr></w:p>`;
  return linePara.repeat(lineCount);
}

/** Gap between patient table and section content. */
export function buildPatientBodyGapXml(): string {
  return buildLineGapXml(PATIENT_BODY_GAP_LINES);
}

/** Gap before doctor / registration / prescriber signature lines. */
export function buildSignatureBlockGapXml(): string {
  return buildLineGapXml(SIGNATURE_BLOCK_GAP_LINES);
}

/** Empty lines before the footer graphic (body end). */
export function buildFooterGapXml(): string {
  return buildLineGapXml(FOOTER_GAP_LINES);
}

function estimateParagraphTwips(pXml: string): number {
  const before = Number(pXml.match(/w:before="(\d+)"/)?.[1] ?? 0);
  const after = Number(pXml.match(/w:after="(\d+)"/)?.[1] ?? 0);
  const line = Number(pXml.match(/w:line="(\d+)"/)?.[1] ?? LINE_TWIPS);

  const cyMatch = pXml.match(/<wp:(?:inline|anchor)[^>]*>[\s\S]*?cy="(\d+)"/);
  if (cyMatch) {
    return before + emuToTwips(Number(cyMatch[1])) + after;
  }

  const hasText = /<w:t[^>]*>[^\s<]/.test(pXml);
  if (!hasText && before === 0 && after === 0) return line;
  return before + line + after;
}

/** Sum paragraph heights in a fragment (table cell or body). */
function sumParagraphsTwips(fragment: string): number {
  let total = 0;
  for (const m of fragment.matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)) {
    total += estimateParagraphTwips(m[0]);
  }
  return total;
}

export function estimateBodyContentTwips(bodyXml: string): number {
  let total = 0;
  let last = 0;
  const tblRe = /<w:tbl>[\s\S]*?<\/w:tbl>/g;
  let m: RegExpExecArray | null;
  while ((m = tblRe.exec(bodyXml)) !== null) {
    total += sumParagraphsTwips(bodyXml.slice(last, m.index));
    total += sumParagraphsTwips(m[0]);
    total += 160; // tbl cell top+bottom padding (80+80 dxa)
    last = m.index + m[0].length;
  }
  total += sumParagraphsTwips(bodyXml.slice(last));
  return total;
}

type SectionMargins = {
  top: number;
  bottom: number;
  header: number;
  pageWidth: number;
};

export function parseSectionMargins(sectPrXml: string): SectionMargins {
  return {
    top: Math.round(Number(sectPrXml.match(/w:top="([^"]+)"/)?.[1] ?? 1440)),
    bottom: Math.round(Number(sectPrXml.match(/w:bottom="([^"]+)"/)?.[1] ?? 720)),
    header: Math.round(Number(sectPrXml.match(/w:header="([^"]+)"/)?.[1] ?? 850)),
    pageWidth: Math.round(Number(sectPrXml.match(/<w:pgSz[^>]*w:w="([^"]+)"/)?.[1] ?? 11909)),
  };
}

/**
 * Set page height so the sheet ends just below the footer (no trailing blank area).
 */
export function fitPageHeightToContent(
  documentXml: string,
  footerBandTwips = 0,
): string {
  const bodyStart = documentXml.indexOf("<w:body>") + 8;
  const sectIdx = documentXml.indexOf("<w:sectPr");
  if (sectIdx < 0) return documentXml;

  const bodyXml = documentXml.slice(bodyStart, sectIdx);
  const sectPr = documentXml.slice(sectIdx);
  const margins = parseSectionMargins(sectPr);

  const contentTwips = estimateBodyContentTwips(bodyXml);
  /** Small buffer for header logo extent vs w:header reserve. */
  const PAGE_HEIGHT_BUFFER = 180;
  const pageHeight = Math.round(
    Math.min(
      MAX_PAGE_HEIGHT_TWIPS,
      Math.max(
        MIN_PAGE_HEIGHT_TWIPS,
        margins.top +
          margins.header +
          contentTwips +
          footerBandTwips +
          margins.bottom +
          PAGE_HEIGHT_BUFFER,
      ),
    ),
  );

  const pageWidth = margins.pageWidth || 11909;
  const updatedSect = sectPr
    .replace(
      /<w:pgSz[^/]*\/>/,
      `<w:pgSz w:w="${pageWidth}" w:h="${pageHeight}" w:orient="portrait"/>`,
    )
    .replace(/w:bottom="[^"]+"/, 'w:bottom="144"');

  return documentXml.slice(0, sectIdx) + updatedSect;
}
