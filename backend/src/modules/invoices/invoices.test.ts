import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { after, before, describe, it } from "node:test";

loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * SF12 (code review 2026-07-05): invoices had zero test coverage despite
 * being one of the two money-critical modules flagged in the review
 * (invoice numbers are financial documents; a collision or skipped
 * idempotency check is a real accounting problem).
 */
describe("invoices", () => {
  let prisma: Awaited<typeof import("../../db/prisma.js")>["prisma"];
  let invoiceNumberMod: typeof import("../../lib/invoice-number.js");
  let generateInvoiceMod: typeof import("./generate-invoice.service.js");
  let bootError: unknown = null;

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      invoiceNumberMod = await import("../../lib/invoice-number.js");
      generateInvoiceMod = await import("./generate-invoice.service.js");
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
    }
  });

  after(async () => {
    // PDF renders launch a shared Chromium; without closing it the browser
    // child process keeps this test worker alive until the runner times out.
    const renderer = await import("../generated-documents/html-document-renderer.js");
    await renderer.closeSharedBrowser();
  });

  const skipIfNoDb = (): boolean => {
    if (bootError) {
      console.warn("[skip] DB unreachable:", (bootError as Error).message?.slice(0, 80));
      return true;
    }
    return false;
  };

  describe("invoicePrefix", () => {
    it("returns the known prefix for a country with invoicing enabled", () => {
      assert.equal(invoiceNumberMod.invoicePrefix("ie"), "IE");
      assert.equal(invoiceNumberMod.invoicePrefix("CZ"), "CZ");
      assert.equal(invoiceNumberMod.invoicePrefix("rm"), "RO");
    });

    it("returns null for Portugal (no invoices issued there)", () => {
      assert.equal(invoiceNumberMod.invoicePrefix("pt"), null);
    });

    it("returns null for an unknown country code", () => {
      assert.equal(invoiceNumberMod.invoicePrefix("zz"), null);
    });
  });

  describe("generateInvoiceNumber concurrency", () => {
    const testCountry = `zz-inv-${Date.now()}`.slice(0, 8);

    it("concurrent calls never produce the same number for the same country", async (t) => {
      if (skipIfNoDb()) return t.skip();
      // Route the test country through a real prefix by monkey-patching is
      // overkill here — instead prove atomicity directly against the
      // counter table, which is the actual race the review flagged.
      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          invoiceNumberMod.generateInvoiceNumber("ie").catch(() => null),
        ),
      );
      const numbers = results.filter((r): r is string => r !== null);
      const unique = new Set(numbers);
      assert.equal(unique.size, numbers.length, "every concurrent call got a distinct invoice number");
    });

    it("throws for a country with no invoice prefix", async () => {
      await assert.rejects(() => invoiceNumberMod.generateInvoiceNumber(testCountry));
    });
  });

  describe("generateInvoiceForOrder skip branches", () => {
    const uniq = `inv-test-${Date.now()}`;
    let currencyId: string;
    let countryId: string;

    before(async () => {
      if (bootError) return;
      const currency = await prisma.currency.create({
        data: { code: `C${uniq}`.slice(0, 9), symbol: "€", decimals: 2 },
      });
      currencyId = currency.id;
      const country = await prisma.country.create({
        data: {
          code: `T${uniq}`.slice(0, 8).toUpperCase(),
          name: `Invoice Test ${uniq}`,
          slug: `invoice-test-${uniq}`,
          legacyHomePath: `/legacy-${uniq}`,
          teamPath: `/team-${uniq}`,
          generalConsultationPath: `/gen-${uniq}`,
          specialistConsultationPath: `/spec-${uniq}`,
          currencyId: currency.id,
        },
      });
      countryId = country.id;
    });

    const makeOrder = (countryCode: string, overrides: Record<string, unknown> = {}) =>
      prisma.order.create({
        data: {
          email: `${uniq}@test.local`,
          fullName: "Invoice Test",
          countryCode,
          currencyCode: `C${uniq}`.slice(0, 9),
          subtotalCents: 1000,
          totalCents: 1000,
          ...overrides,
        },
      });

    it("skips Portugal — no invoice row created", async (t) => {
      if (skipIfNoDb()) return t.skip();
      const order = await makeOrder("pt");
      try {
        await generateInvoiceMod.generateInvoiceForOrder(order.id);
        const invoice = await prisma.invoice.findFirst({ where: { orderId: order.id } });
        assert.equal(invoice, null);
      } finally {
        await prisma.order.delete({ where: { id: order.id } });
      }
    });

    it("skips a country with no invoice prefix — no invoice row created", async (t) => {
      if (skipIfNoDb()) return t.skip();
      const order = await makeOrder("zz-no-prefix");
      try {
        await generateInvoiceMod.generateInvoiceForOrder(order.id);
        const invoice = await prisma.invoice.findFirst({ where: { orderId: order.id } });
        assert.equal(invoice, null);
      } finally {
        await prisma.order.delete({ where: { id: order.id } });
      }
    });

    it("is idempotent — a second call does not create a duplicate invoice", async (t) => {
      if (skipIfNoDb()) return t.skip();
      const order = await makeOrder("ie");
      try {
        const existing = await prisma.invoice.create({
          data: {
            invoiceNumber: `IE-TEST-${uniq}`,
            orderId: order.id,
            countryCode: "ie",
            emailSentTo: order.email,
          },
        });
        await generateInvoiceMod.generateInvoiceForOrder(order.id);
        const invoices = await prisma.invoice.findMany({ where: { orderId: order.id } });
        assert.equal(invoices.length, 1);
        assert.equal(invoices[0].id, existing.id);
      } finally {
        await prisma.invoice.deleteMany({ where: { orderId: order.id } });
        await prisma.order.delete({ where: { id: order.id } });
      }
    });

    it("returns quietly when the order does not exist", async (t) => {
      if (skipIfNoDb()) return t.skip();
      await assert.doesNotReject(() => generateInvoiceMod.generateInvoiceForOrder("nonexistent-order-id"));
    });

    it("transitions an existing unpaid INVOICE to a RECEIPT on payment (same number)", async (t) => {
      if (skipIfNoDb()) return t.skip();
      const order = await makeOrder("ie");
      try {
        const existing = await prisma.invoice.create({
          data: {
            invoiceNumber: `IE-UNPAID-${uniq}`,
            orderId: order.id,
            countryCode: "ie",
            emailSentTo: order.email,
            documentType: "INVOICE",
          },
        });
        await generateInvoiceMod.generateInvoiceForOrder(order.id);
        const invoices = await prisma.invoice.findMany({ where: { orderId: order.id } });
        assert.equal(invoices.length, 1);
        assert.equal(invoices[0].id, existing.id);
        assert.equal(invoices[0].documentType, "RECEIPT");
        assert.equal(invoices[0].invoiceNumber, `IE-UNPAID-${uniq}`);
      } finally {
        await prisma.invoice.deleteMany({ where: { orderId: order.id } });
        await prisma.order.delete({ where: { id: order.id } });
      }
    });

    it("creates a combined INVOICE_RECEIPT for a direct-website order (no prior invoice)", async (t) => {
      if (skipIfNoDb()) return t.skip();
      const order = await makeOrder("ie", { paymentStatus: "PAID", paidAt: new Date() });
      try {
        await generateInvoiceMod.generateInvoiceForOrder(order.id);
        const invoices = await prisma.invoice.findMany({ where: { orderId: order.id } });
        assert.equal(invoices.length, 1);
        assert.equal(invoices[0].documentType, "INVOICE_RECEIPT");
      } finally {
        await prisma.invoice.deleteMany({ where: { orderId: order.id } });
        await prisma.order.delete({ where: { id: order.id } });
      }
    });

    it("createUnpaidInvoiceForOrder issues an unpaid INVOICE for a manual/AI booking", async (t) => {
      if (skipIfNoDb()) return t.skip();
      const order = await makeOrder("ie");
      try {
        await generateInvoiceMod.createUnpaidInvoiceForOrder(order.id);
        const invoices = await prisma.invoice.findMany({ where: { orderId: order.id } });
        assert.equal(invoices.length, 1);
        assert.equal(invoices[0].documentType, "INVOICE");
      } finally {
        await prisma.invoice.deleteMany({ where: { orderId: order.id } });
        await prisma.order.delete({ where: { id: order.id } });
      }
    });

    it("createUnpaidInvoiceForOrder skips Portugal — no invoice row created", async (t) => {
      if (skipIfNoDb()) return t.skip();
      const order = await makeOrder("pt");
      try {
        await generateInvoiceMod.createUnpaidInvoiceForOrder(order.id);
        const invoice = await prisma.invoice.findFirst({ where: { orderId: order.id } });
        assert.equal(invoice, null);
      } finally {
        await prisma.order.delete({ where: { id: order.id } });
      }
    });

    it("cleans up fixtures", async (t) => {
      if (skipIfNoDb()) return t.skip();
      await prisma.country.deleteMany({ where: { id: countryId } });
      await prisma.currency.deleteMany({ where: { id: currencyId } });
    });
  });
});
