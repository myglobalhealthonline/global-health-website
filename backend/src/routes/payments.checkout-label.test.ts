import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";

loadEnv({ path: join(__dirname, "../..", ".env") });

/**
 * PRIV-001 Part A: the Stripe line-item label must be a generic, non-clinical
 * service label and must NEVER carry the appointment's free-text notes (PHI).
 */
describe("buildAppointmentCheckoutProductData (PRIV-001)", () => {
  const NOTES = "patient reports chest pain and shortness of breath";
  let buildAppointmentCheckoutProductData:
    typeof import("./payments.route.js")["buildAppointmentCheckoutProductData"];

  before(async () => {
    ({ buildAppointmentCheckoutProductData } = await import("./payments.route.js"));
  });

  it("uses the service public name and drops clinical notes", () => {
    const pd = buildAppointmentCheckoutProductData({
      service: { name: "General Consultation" },
      // notes present on the row must never reach Stripe
      ...({ notes: NOTES } as object),
    } as never);
    assert.equal(pd.name, "General Consultation");
    assert.equal((pd as Record<string, unknown>).description, undefined);
    assert.equal(JSON.stringify(pd).includes(NOTES), false);
    assert.equal(JSON.stringify(pd).includes("chest pain"), false);
  });

  it("falls back to a neutral label when the service has no name", () => {
    assert.equal(
      buildAppointmentCheckoutProductData({ service: null }).name,
      "Medical consultation",
    );
    assert.equal(
      buildAppointmentCheckoutProductData({ service: { name: "  " } }).name,
      "Medical consultation",
    );
  });
});
