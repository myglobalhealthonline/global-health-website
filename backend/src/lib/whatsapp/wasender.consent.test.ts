import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";

loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * PRIV-001 Part B: the patient WhatsApp consent gate must fail CLOSED.
 * A consent-gated send is skipped for an explicit `false` or `null` consent,
 * and only a `true` consent is allowed past the gate.
 */
describe("sendWhatsAppText patient consent gate (PRIV-001)", () => {
  const CONSENT_SKIP = "Skipped — no WhatsApp consent";
  let sendWhatsAppText: typeof import("./wasender.js")["sendWhatsAppText"];

  before(async () => {
    ({ sendWhatsAppText } = await import("./wasender.js"));
  });

  it("skips when consent is explicitly false", async () => {
    const res = await sendWhatsAppText({
      to: "+353894715849",
      message: "hi",
      patientConsent: false,
    });
    assert.equal(res.skipped, true);
    assert.equal(res.message, CONSENT_SKIP);
  });

  it("skips when consent is null (fail closed on missing consent)", async () => {
    const res = await sendWhatsAppText({
      to: "+353894715849",
      message: "hi",
      // simulate a nullable consent field arriving as null
      patientConsent: null,
    });
    assert.equal(res.skipped, true);
    assert.equal(res.message, CONSENT_SKIP);
  });

  it("passes the consent gate when consent is explicitly true", async () => {
    // With no WA auth configured in the test env, the send still short-circuits
    // to a skip AFTER the consent gate — but WITHOUT the consent-skip message,
    // proving the gate was cleared rather than blocking the send.
    const res = await sendWhatsAppText({
      to: "+353894715849",
      message: "hi",
      patientConsent: true,
    });
    assert.notEqual(res.message, CONSENT_SKIP);
  });
});
