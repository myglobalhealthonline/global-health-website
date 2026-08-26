import assert from "node:assert/strict";
import { before, describe, it, mock } from "node:test";

let resendInvoiceWhatsApp: (typeof import("./generate-invoice.service.js"))["resendInvoiceWhatsApp"];
let sentMessage = "";

before(async () => {
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        invoice: {
          findUnique: async () => ({
            id: "inv_1",
            invoiceNumber: "IE-0001",
            documentType: "INVOICE",
            countryCode: "ie",
            order: {
              id: "order_1",
              fullName: "Patient Example",
              phone: "+3531111111",
              countryCode: "ie",
              notificationLocale: "EN",
              items: [
                {
                  patientWhatsappConsent: true,
                  patientAddressCountryCode: "IE",
                },
              ],
            },
          }),
        },
      },
    },
  });
  mock.module("../../lib/email/send-email.js", {
    namedExports: {
      absoluteSiteUrl: (path: string) => `https://www.myglobalhealth.test${path}`,
    },
  });
  mock.module("./invoice-public-link.service.js", {
    namedExports: {
      issueInvoicePublicCapability: async () => "invoice-capability-token",
    },
  });
  mock.module("../../lib/whatsapp/wasender.js", {
    namedExports: {
      sendWhatsAppText: async ({ message }: { message: string }) => {
        sentMessage = message;
        return { ok: true, skipped: false };
      },
      formatWhatsAppSendError: () => "send failed",
    },
  });
  mock.module("../automation/notification-language.js", {
    namedExports: { resolveNotificationLang: () => "en" },
  });
  mock.module("../automation/whatsapp-contact-footer.js", {
    namedExports: { whatsappContactFooter: () => "" },
  });
  mock.module("../../lib/invoice-number.js", {
    namedExports: {
      invoicePrefix: () => "IE",
      generateInvoiceNumber: async () => "IE-0001",
      generateCreditNoteNumber: async () => "CN-IE-0001",
    },
  });
  mock.module("../../lib/email/templates.js", {
    namedExports: { sendInvoiceEmail: async () => undefined },
  });
  mock.module("../../lib/email/sales-invoice-copy.js", {
    namedExports: { sendSalesInvoiceCopy: async () => undefined },
  });
  mock.module("./invoice-pdf.js", {
    namedExports: {
      buildInvoicePdfData: async () => null,
      renderInvoicePdfBuffer: async () => null,
    },
  });

  ({ resendInvoiceWhatsApp } = await import("./generate-invoice.service.js"));
});

describe("resendInvoiceWhatsApp secure link", () => {
  it("sends a tokenized invoice URL instead of a raw invoice id link", async () => {
    const result = await resendInvoiceWhatsApp("inv_1");

    assert.deepEqual(result, { ok: true });
    assert.match(
      sentMessage,
      /https:\/\/www\.myglobalhealth\.test\/print\/order-invoices\/inv_1\?token=invoice-capability-token/,
    );
  });
});
