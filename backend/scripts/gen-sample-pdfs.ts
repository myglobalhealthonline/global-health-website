import fs from "node:fs";
import path from "node:path";
import { renderInvoicePdfBuffer, type InvoicePdfData } from "../src/modules/invoices/invoice-pdf.js";
import { renderDocumentPdf, closePdfBrowser } from "../src/modules/generated-documents/html-document-renderer.js";

const outDir = process.argv[2] ?? "sample-pdfs";
fs.mkdirSync(outDir, { recursive: true });

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

async function run() {
  const invoiceJobs: [string, InvoicePdfData["documentType"], string][] = [
    ["invoice-sample.pdf", "INVOICE", "INV-IE-00001"],
    ["receipt-sample.pdf", "RECEIPT", "INV-IE-00001"],
    ["invoice-receipt-sample.pdf", "INVOICE_RECEIPT", "INV-IE-00001"],
    ["credit-note-sample.pdf", "CREDIT_NOTE", "CN-IE-00001"],
  ];

  for (const [file, documentType, invoiceNumber] of invoiceJobs) {
    const buf = await renderInvoicePdfBuffer({ ...invoiceBase, documentType, invoiceNumber });
    if (buf) fs.writeFileSync(path.join(outDir, file), buf);
    console.log("wrote", file);
  }

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

  const docJobs: [string, "ABSENCE_CERTIFICATE" | "EXAMS_PRESCRIPTION" | "PRESCRIPTION" | "OTHER" | "CUSTOM_CERTIFICATE", Record<string, unknown>][] = [
    ["absence-certificate-sample.pdf", "ABSENCE_CERTIFICATE", { ...commonCtx, title: "Medical Absence Certificate", startDate: "10/07/2026", endDate: "12/07/2026", reason: "Medical Confidentiality (GDPR)" }],
    ["exams-prescription-sample.pdf", "EXAMS_PRESCRIPTION", { ...commonCtx, title: "Examinations Prescription", examsNotes: "Full blood count, Chest X-ray" }],
    ["medicine-prescription-sample.pdf", "PRESCRIPTION", { ...commonCtx, title: "Medical Prescription", medication1: "Amoxicillin 500mg — 1 tablet 3x/day for 7 days", medication2: "Paracetamol 500mg — as needed for pain", pharmacy: "Any registered pharmacy" }],
    ["custom-certificate-sample.pdf", "CUSTOM_CERTIFICATE", { ...commonCtx, certificateName: "Fitness to Travel Certificate", title: undefined, singleDate: new Date().toLocaleDateString("en-GB"), reason: "Patient examined and found fit to travel" }],
    ["other-document-sample.pdf", "OTHER", { ...commonCtx, title: "Medical Report", body: "Sample free-text medical report body. Patient presented with mild symptoms, examined, no acute findings." }],
  ];

  for (const [file, documentType, ctx] of docJobs) {
    try {
      const buf = await renderDocumentPdf("ie", documentType, ctx);
      fs.writeFileSync(path.join(outDir, file), buf);
      console.log("wrote", file);
    } catch (err) {
      console.error("failed", file, err);
    }
  }

  await closePdfBrowser();
}

run().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
