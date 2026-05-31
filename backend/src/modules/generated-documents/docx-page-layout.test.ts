import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildFooterGapXml,
  buildPatientBodyGapXml,
  buildSignatureBlockGapXml,
  PATIENT_BODY_GAP_LINES,
  SIGNATURE_BLOCK_GAP_LINES,
  estimateBodyContentTwips,
  fitPageHeightToContent,
  FOOTER_GAP_LINES,
  FOOTER_GAP_TWIPS,
  LINE_TWIPS,
} from "./docx-page-layout.js";

describe("docx-page-layout", () => {
  it("patient body gap is exactly two lines", () => {
    assert.equal((buildPatientBodyGapXml().match(/<w:p[\s>]/g) || []).length, PATIENT_BODY_GAP_LINES);
  });

  it("signature block gap is two lines before doctor block", () => {
    assert.equal(
      (buildSignatureBlockGapXml().match(/<w:p[\s>]/g) || []).length,
      SIGNATURE_BLOCK_GAP_LINES,
    );
  });

  it("footer gap is exactly four lines before footer band", () => {
    const gap = buildFooterGapXml();
    assert.equal((gap.match(/<w:p[\s>]/g) || []).length, FOOTER_GAP_LINES);
    assert.ok(gap.includes(`w:line="${LINE_TWIPS}"`));
    assert.equal(FOOTER_GAP_TWIPS, LINE_TWIPS * 4);
  });

  it("fitPageHeightToContent sets pgSz h below A4 for short body", () => {
    const body =
      `<w:body>${buildFooterGapXml()}<w:p><w:pPr><w:spacing w:line="240"/></w:pPr>` +
      `<w:r><w:t>Line</w:t></w:r></w:p>` +
      `<w:p><w:pPr/><w:drawing><wp:inline><wp:extent cx="100" cy="914400"/>` +
      `</wp:inline></w:drawing></w:p>` +
      `<w:sectPr><w:pgSz w:h="16834" w:w="11909" w:orient="portrait"/>` +
      `<w:pgMar w:bottom="720" w:top="1440" w:left="1440" w:right="1440" w:header="850"/></w:sectPr></w:body>`;
    const out = fitPageHeightToContent(body);
    const h = Number(out.match(/w:h="(\d+)"/)?.[1]);
    assert.ok(h < 16834);
    assert.ok(h > 4000);
  });

  it("estimateBodyContentTwips includes table paragraphs", () => {
    const xml =
      `<w:tbl><w:tr><w:tc><w:p><w:pPr><w:spacing w:line="240" w:after="50"/></w:pPr>` +
      `<w:r><w:t>A</w:t></w:r></w:p></w:tc></w:tr></w:tbl>`;
    assert.ok(estimateBodyContentTwips(xml) > 200);
  });
});
