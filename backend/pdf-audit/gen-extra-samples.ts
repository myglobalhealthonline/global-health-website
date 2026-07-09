// Renders a CZ-localized clinical sample + a report-export sample (mock data).
// Usage: npx tsx pdf-audit/gen-extra-samples.ts
import fs from "node:fs";
import { chromium } from "playwright";
import {
  renderDocumentHtml,
  htmlToPdfBuffer,
  closePdfBrowser,
} from "../src/modules/generated-documents/html-document-renderer.js";
import { buildReportHtml } from "../src/modules/reports/report-formatters.js";

const czCtx = {
  title: "Pracovní neschopnost",
  patientName: "Jana Vzorková",
  patientIdLine: "P-000123",
  birthDate: "01/01/1990",
  address: "Vzorová 12, Praha",
  consultationDate: "09/07/2026",
  doctorName: "MUDr. Jan Novák",
  registrationNumber: "CLK-12345",
  currentDate: "09/07/2026",
  documentId: "DOC-CZ-0001",
  certificateId: "CERT-CZ-0001",
  startDate: "10/07/2026",
  endDate: "12/07/2026",
  reason: "Lékařské tajemství (GDPR)",
};

const reportTable = {
  title: "Consultations report",
  subtitle: "Dr John Smith · last 30 days",
  generatedAt: new Date().toISOString(),
  columns: [
    { key: "d", label: "Date" },
    { key: "p", label: "Patient" },
    { key: "s", label: "Service" },
    { key: "a", label: "Amount", align: "right" as const },
  ],
  rows: [
    { d: "01/07/2026", p: "Jane Sample", s: "General Consultation", a: "85.00" },
    { d: "03/07/2026", p: "John Sample", s: "Prescription", a: "25.00" },
    { d: "", p: "", s: "Total", a: "110.00", _total: true },
  ],
};

async function run() {
  const html = renderDocumentHtml("cz", "ABSENCE_CERTIFICATE", czCtx);
  const report = buildReportHtml(reportTable);
  fs.writeFileSync("pdf-audit/final-samples/report-sample.pdf", await htmlToPdfBuffer(report));
  fs.writeFileSync("pdf-audit/final-samples/absence-cz-localized.pdf", await htmlToPdfBuffer(html));
  await closePdfBrowser();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
  await page.setContent(html, { waitUntil: "load" });
  await page.screenshot({ path: "pdf-audit/final-samples/previews/absence-cz-localized.png", clip: { x: 0, y: 0, width: 794, height: 1123 } });
  await page.setContent(report, { waitUntil: "load" });
  await page.screenshot({ path: "pdf-audit/final-samples/previews/report-sample.png", clip: { x: 0, y: 0, width: 794, height: 1123 } });
  await browser.close();
  console.log("done");
}

run().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
