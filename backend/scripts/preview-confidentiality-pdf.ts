/**
 * Render the doctor confidentiality agreement PDF to disk for visual review.
 *
 * No database access — synthetic doctor input only, so it is safe to run
 * against a local env pointed at the live database.
 *
 *   node --import tsx scripts/preview-confidentiality-pdf.ts [locale] [out.pdf]
 */
import { writeFile } from "node:fs/promises";
import { buildConfidentialityAgreementHtml } from "../src/modules/confidentiality/confidentiality-pdf.js";
import {
  AGREEMENT_LOCALES,
  resolveAgreementLocale,
} from "../src/modules/confidentiality/confidentiality-agreement-content.js";
import {
  closeSharedBrowser,
  htmlToPdfBuffer,
} from "../src/modules/generated-documents/html-document-renderer.js";

async function main(): Promise<void> {
  const [localeArg, outArg] = process.argv.slice(2);
  const locale = resolveAgreementLocale(localeArg);
  console.log(`locale: ${locale} (available: ${AGREEMENT_LOCALES.join(", ")})`);

  const html = buildConfidentialityAgreementHtml({
    doctor: {
      fullName: "Dr. Ana Ferreira",
      title: "Consultant in Internal Medicine",
      countryName: "Portugal",
      email: "ana.ferreira@example.com",
    },
    locale,
    acceptedAt: new Date("2026-07-01T10:12:00Z"),
    acceptedVersion: "1.0.0",
    issuedAt: new Date("2026-07-24T00:00:00Z"),
  });

  const out = outArg ?? `confidentiality-preview-${locale}.pdf`;
  const pdf = await htmlToPdfBuffer(html);
  await writeFile(out, pdf);
  await writeFile(out.replace(/\.pdf$/, ".html"), html, "utf8");
  console.log(`wrote ${out} (${pdf.length} bytes)`);
  await closeSharedBrowser();
}

void main();
