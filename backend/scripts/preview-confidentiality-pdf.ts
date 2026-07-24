/**
 * Render the doctor confidentiality agreement PDF to disk for visual review.
 *
 * No database access — synthetic doctor input only, so it is safe to run
 * against a local env pointed at the live database.
 *
 *   node --import tsx scripts/preview-confidentiality-pdf.ts [out.pdf]
 */
import { writeFile } from "node:fs/promises";
import {
  buildConfidentialityAgreementHtml,
  parseAgreementBlocks,
} from "../src/modules/confidentiality/confidentiality-pdf.js";
import { CURRENT_AGREEMENT_TEXT } from "../src/modules/confidentiality/confidentiality.service.js";
import {
  closeSharedBrowser,
  htmlToPdfBuffer,
} from "../src/modules/generated-documents/html-document-renderer.js";

async function main(): Promise<void> {
  const blocks = parseAgreementBlocks(CURRENT_AGREEMENT_TEXT);
  console.log(
    "parsed blocks:",
    blocks.map((b) =>
      b.kind === "clause" ? `${b.number}. ${b.heading}` : `intro(${b.text.slice(0, 44)}…)`,
    ),
  );

  const html = buildConfidentialityAgreementHtml({
    doctor: {
      fullName: "Dr. Ana Ferreira",
      title: "Consultant in Internal Medicine",
      countryName: "Portugal",
      email: "ana.ferreira@example.com",
    },
    acceptedAt: new Date("2026-07-01T10:12:00Z"),
    acceptedVersion: "1.0.0",
    issuedAt: new Date("2026-07-24T00:00:00Z"),
  });

  const out = process.argv[2] ?? "confidentiality-preview.pdf";
  const pdf = await htmlToPdfBuffer(html);
  await writeFile(out, pdf);
  await writeFile(out.replace(/\.pdf$/, ".html"), html, "utf8");
  console.log(`wrote ${out} (${pdf.length} bytes)`);
  await closeSharedBrowser();
}

void main();
