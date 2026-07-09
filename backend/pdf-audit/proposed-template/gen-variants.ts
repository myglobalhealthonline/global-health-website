// Generates variant B/C/D samples (PDF + first-page PNG). Mock data only.
// Usage: npx tsx pdf-audit/proposed-template/gen-variants.ts
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { htmlToPdfBuffer, closePdfBrowser } from "../../src/modules/generated-documents/html-document-renderer.js";
import type { InvoicePdfData } from "../../src/modules/invoices/invoice-pdf.js";
import { buildVariantB, buildVariantC, buildVariantD } from "./variants.js";
import { buildVariantE, buildVariantF, buildVariantG } from "./variants2.js";
import { buildVariantH, buildVariantI, buildVariantJ } from "./variants3.js";
import { buildVariantK } from "./variant-k.js";
import { buildProposedInvoiceHtml } from "./invoice-template.js";

const outDir = path.join("pdf-audit", "proposed-template");
const logo = (name: string) =>
  `data:image/png;base64,${fs.readFileSync(path.join("..", "frontend", "public", "logos", name)).toString("base64")}`;
const logoDark = logo("global-health-dark.png");
const logoLight = logo("global-health-light.png");

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

const variants: [string, (d: InvoicePdfData, l: string) => string, string][] = [
  ["variant-b-minimal", buildVariantB, logoDark],
  ["variant-c-folio", buildVariantC, logoDark],
  ["variant-d-spine", buildVariantD, logoDark],
  ["variant-e-poster", buildVariantE, logoDark],
  ["variant-f-darkluxe", buildVariantF, logoLight],
  ["variant-g-brutalist", buildVariantG, logoDark],
  ["variant-h-inkledger", buildVariantH, logoDark],
  ["variant-i-railledger", buildVariantI, logoDark],
  ["variant-j-monoposter", buildVariantJ, logoDark],
  ["variant-k-spine-poster", buildVariantK, logoDark],
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
  const bwDir = path.join(outDir, "bw-previews");
  fs.mkdirSync(bwDir, { recursive: true });
  const all: [string, string][] = [
    ["proposed-invoice-a", buildProposedInvoiceHtml(data, logoDark)],
    ...variants.map(([name, build, logoUrl]) => [name, build(data, logoUrl)] as [string, string]),
  ];
  for (const [name, html] of all) {
    if (name !== "proposed-invoice-a") {
      fs.writeFileSync(path.join(outDir, `${name}.pdf`), await htmlToPdfBuffer(html));
      await page.setContent(html, { waitUntil: "load" });
      await page.screenshot({ path: path.join(outDir, `${name}.png`), clip: { x: 0, y: 0, width: 794, height: 1123 } });
    }
    // B/W laser-print simulation: grayscale everything.
    await page.setContent(html.replace("<style>", "<style>html{filter:grayscale(1);}"), { waitUntil: "load" });
    await page.screenshot({ path: path.join(bwDir, `bw-${name}.png`), clip: { x: 0, y: 0, width: 794, height: 1123 } });
    console.log("wrote", name);
  }
  await browser.close();
  await closePdfBrowser();
}

run().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
