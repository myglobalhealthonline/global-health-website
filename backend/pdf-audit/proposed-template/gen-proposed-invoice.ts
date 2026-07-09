// Generates the proposed invoice sample (PDF + first-page PNG). Mock data only.
// Usage: npx tsx pdf-audit/proposed-template/gen-proposed-invoice.ts
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { htmlToPdfBuffer, closePdfBrowser } from "../../src/modules/generated-documents/html-document-renderer.js";
import type { InvoicePdfData } from "../../src/modules/invoices/invoice-pdf.js";
import { buildProposedInvoiceHtml } from "./invoice-template.js";

const outDir = path.join("pdf-audit", "proposed-template");

const logoPath = path.join("..", "frontend", "public", "logos", "global-health-dark.png");
const logoDataUrl = `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`;

const data: InvoicePdfData = {
  invoiceNumber: "INV-IE-00042",
  invoiceDate: new Date().toISOString(),
  countryCode: "ie",
  documentType: "INVOICE_RECEIPT",
  order: {
    fullName: "Jane Sample Patient",
    email: "jane.sample@example.com",
    phone: "+353 87 123 4567",
    currencyCode: "EUR",
    totalCents: 11000,
    subtotalCents: 11000,
    shippingCents: 0,
    paidAt: new Date().toISOString(),
    taxIdNumber: "IE1234567T",
    consultationDate: new Date().toISOString(),
    items: [
      { name: "General Consultation — Video", quantity: 1, unitPriceCents: 8500, lineTotalCents: 8500 },
      { name: "Medical Absence Certificate", quantity: 1, unitPriceCents: 2500, lineTotalCents: 2500 },
    ],
  },
  doctor: { fullName: "Dr. John Smith", registrationNumber: "IMC-12345", chamberEntity: "Irish Medical Council" },
};

async function run() {
  const html = buildProposedInvoiceHtml(data, logoDataUrl);
  fs.writeFileSync(path.join(outDir, "proposed-invoice.html"), html);

  const pdf = await htmlToPdfBuffer(html);
  fs.writeFileSync(path.join(outDir, "proposed-invoice-sample.pdf"), pdf);
  await closePdfBrowser();
  console.log("wrote proposed-invoice-sample.pdf");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
  await page.setContent(html, { waitUntil: "load" });
  await page.screenshot({
    path: path.join(outDir, "proposed-invoice-preview.png"),
    clip: { x: 0, y: 0, width: 794, height: 1123 },
  });
  await browser.close();
  console.log("wrote proposed-invoice-preview.png");
}

run().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
