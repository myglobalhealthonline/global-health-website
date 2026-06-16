import type PizZip from "pizzip";

/**
 * Engrave a QR image (the per-prescription patient-upload link) onto the
 * exams-prescription DOCX, just above the footer band.
 *
 * Touches three package parts:
 *  - word/media/image-qr.png        (the PNG bytes)
 *  - word/_rels/document.xml.rels    (image relationship)
 *  - [Content_Types].xml             (png default — ensured present)
 * and inserts a centered drawing + instruction paragraphs before <w:sectPr>.
 *
 * Drawing namespaces (wp/a/pic/r) are already declared on the <w:document>
 * root of every template, so the inline image renders in LibreOffice.
 */

const MEDIA_PATH = "word/media/image-qr.png";
const REL_ID = "rIdGhQrUpload";
const REL_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";

/** 1px = 9525 EMU. ~130px square keeps the code crisp without crowding the footer. */
const QR_EMU = 130 * 9525;

/** Global Health brand — forest green (Word hex without #). */
const BRAND_COLOR = "1D4B36";
const MUTED_COLOR = "4A4A4A";
const FONT = process.platform === "win32" ? "Calibri" : "Carlito";
const SIZE_TITLE = "26"; // 13pt
const SIZE_BODY = "20"; // 10pt

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function centeredRunPara(text: string, opts: { bold?: boolean; color: string; size: string }): string {
  const rPr =
    `<w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:cs="${FONT}"/>` +
    `<w:sz w:val="${opts.size}"/><w:szCs w:val="${opts.size}"/>` +
    (opts.bold ? `<w:b w:val="1"/><w:bCs w:val="1"/>` : "") +
    `<w:color w:val="${opts.color}"/><w:rtl w:val="0"/>`;
  return (
    `<w:p><w:pPr><w:jc w:val="left"/>` +
    `<w:spacing w:before="40" w:after="40" w:line="240" w:lineRule="auto"/></w:pPr>` +
    `<w:r><w:rPr>${rPr}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`
  );
}

function qrImageParagraph(): string {
  const ns = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"';
  const picNs = 'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
  return (
    `<w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="80" w:after="20"/></w:pPr>` +
    `<w:r><w:rPr><w:noProof/></w:rPr><w:drawing>` +
    `<wp:inline distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="${QR_EMU}" cy="${QR_EMU}"/>` +
    `<wp:effectExtent l="0" t="0" r="0" b="0"/>` +
    `<wp:docPr id="900" name="ExamUploadQR" descr="Scan to upload exam results"/>` +
    `<wp:cNvGraphicFramePr><a:graphicFrameLocks ${ns} noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
    `<a:graphic ${ns}><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic ${picNs}>` +
    `<pic:nvPicPr><pic:cNvPr id="900" name="ExamUploadQR" descr="Scan to upload exam results"/>` +
    `<pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${REL_ID}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${QR_EMU}" cy="${QR_EMU}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`
  );
}

function ensurePngContentType(zip: PizZip): void {
  const ct = zip.file("[Content_Types].xml");
  if (!ct) return;
  let xml = ct.asText();
  if (/Extension="png"/i.test(xml)) return;
  xml = xml.replace(
    "</Types>",
    `<Default ContentType="image/png" Extension="png"/></Types>`,
  );
  zip.file("[Content_Types].xml", xml);
}

function ensureImageRelationship(zip: PizZip): void {
  const relsPath = "word/_rels/document.xml.rels";
  const rels = zip.file(relsPath);
  if (!rels) throw new Error("Invalid DOCX: missing word/_rels/document.xml.rels");
  let xml = rels.asText();
  if (xml.includes(`Id="${REL_ID}"`)) return;
  const rel = `<Relationship Id="${REL_ID}" Type="${REL_TYPE}" Target="media/image-qr.png"/>`;
  xml = xml.replace("</Relationships>", `${rel}</Relationships>`);
  zip.file(relsPath, xml);
}

/**
 * Insert the QR + caption block immediately before the section properties so
 * the later footer-gap injection sits between it and the footer band, leaving
 * the QR just above the bottom footer.
 */
export function injectQrBlock(
  zip: PizZip,
  documentXml: string,
  pngBuffer: Buffer,
  opts: { title: string; instruction: string },
): string {
  const sectIdx = documentXml.indexOf("<w:sectPr");
  if (sectIdx < 0) return documentXml;

  zip.file(MEDIA_PATH, pngBuffer);
  ensurePngContentType(zip);
  ensureImageRelationship(zip);

  const block =
    qrImageParagraph() +
    centeredRunPara(opts.title, { bold: true, color: BRAND_COLOR, size: SIZE_TITLE }) +
    centeredRunPara(opts.instruction, { color: MUTED_COLOR, size: SIZE_BODY });

  return documentXml.slice(0, sectIdx) + block + documentXml.slice(sectIdx);
}
