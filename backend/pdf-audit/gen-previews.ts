// Renders first-page PNG previews of the sample PDFs' source HTML.
// PDFs and previews come from the same HTML, so screenshots are faithful.
// Usage: npx tsx pdf-audit/gen-previews.ts
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { buildInvoiceHtml, type InvoicePdfData } from "../src/modules/invoices/invoice-pdf.js";
import { renderDocumentHtml } from "../src/modules/generated-documents/html-document-renderer.js";

const outDir = process.argv[2] ?? path.join("pdf-audit", "current-samples", "previews");
fs.mkdirSync(outDir, { recursive: true });

// A4 at 96dpi
const A4 = { width: 794, height: 1123 };

const invoiceBase: Omit<InvoicePdfData, "documentType" | "invoiceNumber"> = {
  invoiceDate: new Date().toISOString(),
  countryCode: "ie",
  order: {
    fullName: "Jane Sample Patient",
    email: "jane.sample@example.com",
    phone: "+353 87 123 4567",
    currencyCode: "EUR",
    totalCents: 8500,
    subtotalCents: 8500,
    shippingCents: 0,
    paidAt: new Date().toISOString(),
    taxIdNumber: null,
    consultationDate: new Date().toISOString(),
    items: [{ name: "General Consultation", quantity: 1, unitPriceCents: 8500, lineTotalCents: 8500 }],
  },
  doctor: { fullName: "Dr. John Smith", registrationNumber: "IMC-12345", chamberEntity: "Irish Medical Council" },
};

const commonCtx = {
  title: "Medical Absence Certificate",
  patientName: "Jane Sample Patient",
  patientIdLine: "P-000123",
  birthDate: "01/01/1990",
  address: "12 Sample Street, Dublin, Ireland",
  consultationDate: new Date().toLocaleDateString("en-GB"),
  doctorName: "Dr. John Smith",
  registrationNumber: "IMC-12345",
  currentDate: new Date().toLocaleDateString("en-GB"),
  documentId: "DOC-SAMPLE-0001",
  certificateId: "CERT-SAMPLE-0001",
};

async function run() {
  const jobs: [string, string][] = [];

  const invoiceJobs: [string, InvoicePdfData["documentType"], string][] = [
    ["invoice-sample", "INVOICE", "INV-IE-00001"],
    ["receipt-sample", "RECEIPT", "INV-IE-00001"],
    ["invoice-receipt-sample", "INVOICE_RECEIPT", "INV-IE-00001"],
    ["credit-note-sample", "CREDIT_NOTE", "CN-IE-00001"],
  ];
  for (const [name, documentType, invoiceNumber] of invoiceJobs) {
    jobs.push([name, buildInvoiceHtml({ ...invoiceBase, documentType, invoiceNumber })]);
  }

  const docJobs: [string, Parameters<typeof renderDocumentHtml>[1], Record<string, unknown>][] = [
    ["absence-certificate-sample", "ABSENCE_CERTIFICATE", { ...commonCtx, startDate: "10/07/2026", endDate: "12/07/2026", reason: "Medical Confidentiality (GDPR)" }],
    ["exams-prescription-sample", "EXAMS_PRESCRIPTION", { ...commonCtx, title: "Examinations Prescription", examsNotes: "Full blood count, Chest X-ray" }],
    ["medicine-prescription-sample", "PRESCRIPTION", { ...commonCtx, title: "Medical Prescription", medication1: "Amoxicillin 500mg — 1 tablet 3x/day for 7 days", medication2: "Paracetamol 500mg — as needed for pain", pharmacy: "Any registered pharmacy" }],
    ["custom-certificate-sample", "CUSTOM_CERTIFICATE", { ...commonCtx, certificateName: "Fitness to Travel Certificate", title: undefined, singleDate: new Date().toLocaleDateString("en-GB"), reason: "Patient examined and found fit to travel" }],
    ["other-document-sample", "OTHER", { ...commonCtx, title: "Medical Report", body: "Sample free-text medical report body. Patient presented with mild symptoms, examined, no acute findings." }],
  ];
  for (const [name, documentType, ctx] of docJobs) {
    jobs.push([name, renderDocumentHtml("ie", documentType, ctx)]);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: A4 });
  for (const [name, html] of jobs) {
    await page.setContent(html, { waitUntil: "load" });
    await page.screenshot({
      path: path.join(outDir, `${name}.png`),
      clip: { x: 0, y: 0, ...A4 },
    });
    console.log("wrote", `${name}.png`);
  }
  await browser.close();
}

run().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
