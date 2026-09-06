import assert from "node:assert/strict";
import { before, describe, it, mock } from "node:test";

type Wasender = typeof import("../../lib/whatsapp/wasender.js");

let resendInvoiceWhatsApp: (typeof import("./generate-invoice.service.js"))["resendInvoiceWhatsApp"];
let sentMessage = "";
/** What the stubbed provider returns for the next resend. */
let waResult: Awaited<ReturnType<Wasender["sendWhatsAppText"]>> = { ok: true, skipped: false };

before(async () => {
  // Capture the REAL formatter before the module is mocked: the point of the
  // PR-6 sink test is that the string this route returns to an admin over HTTP
  // is produced by the real boundary, not by a stub.
  const realFormatWhatsAppSendError = (await import("../../lib/whatsapp/wasender.js"))
    .formatWhatsAppSendError;

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
        return waResult;
      },
      formatWhatsAppSendError: realFormatWhatsAppSendError,
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
    waResult = { ok: true, skipped: false };
    const result = await resendInvoiceWhatsApp("inv_1");

    assert.deepEqual(result, { ok: true });
    assert.match(
      sentMessage,
      /https:\/\/www\.myglobalhealth\.test\/print\/order-invoices\/inv_1\?token=invoice-capability-token/,
    );
  });

  // PR-6 sink: this `message` is sent straight back to the admin caller as the
  // body of a 502 from POST /api/admin/invoices/:id/resend.
  it("returns a send failure without the patient's phone number", async () => {
    waResult = {
      ok: false,
      message: "WaSender rejected the request (HTTP 422)",
      to: "+353871234567",
      countryUsed: "ie",
    };
    const result = await resendInvoiceWhatsApp("inv_1");

    assert.equal(result.ok, false);
    const message = "message" in result ? (result.message ?? "") : "";
    assert.ok(!message.includes("+353871234567"), `route reply leaked E.164: ${message}`);
    assert.ok(!message.includes("353871234567"), `route reply leaked digits: ${message}`);
    assert.ok(!message.includes("e164="), `route reply leaked an e164 field: ${message}`);
    assert.ok(!message.includes("raw="), `route reply leaked a raw field: ${message}`);
    assert.match(message, /HTTP 422/, "the safe failure class survives");
    assert.match(message, /country=ie/, "the country hint survives");
    waResult = { ok: true, skipped: false };
  });
});
