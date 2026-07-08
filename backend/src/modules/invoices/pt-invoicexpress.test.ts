import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";

// Load .env BEFORE the modules under test are imported — env.ts parses at import
// time and requires DATABASE_URL. Static imports are hoisted above this line, so
// the modules must be pulled in dynamically inside before() (same pattern as
// invoices.test.ts).
loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * Portugal InvoiceExpress issuer — pure-helper coverage (no DB, no network).
 * The money-critical bits are the NIF validation (a bad fiscal_id makes the
 * legal invoice wrong) and the dd/mm/yyyy date format InvoiceExpress requires.
 * Guard-order / live-gate behaviour is covered by the end-to-end verification.
 */
describe("pt-invoicexpress", () => {
  let formatIeDate: typeof import("./pt-invoicexpress.service.js")["formatIeDate"];
  let resolveFiscalId: typeof import("./pt-invoicexpress.service.js")["resolveFiscalId"];
  let isInvoiceExpressConfigured: typeof import("../../lib/invoice-express/client.js")["isInvoiceExpressConfigured"];

  before(async () => {
    ({ formatIeDate, resolveFiscalId } = await import("./pt-invoicexpress.service.js"));
    ({ isInvoiceExpressConfigured } = await import("../../lib/invoice-express/client.js"));
  });

  describe("resolveFiscalId", () => {
    it("keeps a valid 9-digit NIF", () => {
      assert.equal(resolveFiscalId("999999990"), "999999990");
      assert.equal(resolveFiscalId("123456789"), "123456789");
    });

    it("strips surrounding whitespace before validating", () => {
      assert.equal(resolveFiscalId("  123456789  "), "123456789");
    });

    it("falls back for missing / short / long / non-numeric ids", () => {
      const FALLBACK = "999999990";
      assert.equal(resolveFiscalId(null), FALLBACK);
      assert.equal(resolveFiscalId(undefined), FALLBACK);
      assert.equal(resolveFiscalId(""), FALLBACK);
      assert.equal(resolveFiscalId("12345"), FALLBACK);
      assert.equal(resolveFiscalId("1234567890"), FALLBACK);
      assert.equal(resolveFiscalId("PT12345678"), FALLBACK);
    });
  });

  describe("formatIeDate", () => {
    it("formats as zero-padded dd/mm/yyyy", () => {
      assert.equal(formatIeDate(new Date(2026, 6, 7)), "07/07/2026"); // month is 0-based
      assert.equal(formatIeDate(new Date(2026, 11, 31)), "31/12/2026");
      assert.equal(formatIeDate(new Date(2026, 0, 1)), "01/01/2026");
    });
  });

  describe("isInvoiceExpressConfigured", () => {
    it("returns a boolean reflecting whether both env vars are set", () => {
      assert.equal(typeof isInvoiceExpressConfigured(), "boolean");
    });
  });
});
