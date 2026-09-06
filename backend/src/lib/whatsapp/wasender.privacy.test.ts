import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

/**
 * PR-6: a WhatsApp send failure must never put the recipient into an error
 * string. Those strings are persisted to `AutomationRun.error`, forwarded to
 * `Outbox.lastError` / ops alerts, written to application logs and returned
 * verbatim by `POST /api/admin/invoices/:id/resend` — none of which is a
 * restricted store for a patient's phone number.
 *
 * Every number here is synthetic.
 *
 * COST NOTE: every case that reaches `fetch` pays the module-level send lock's
 * hard 6-second floor (`gapMs()` takes max(6000, WASENDER_GAP_MS), so no env
 * var can shorten it), and the whole file shares that one lock. This file is
 * therefore ~35s. Cover a NEW leak at the formatter level where you can — add
 * another send-path case only when the leak can only appear on a real send.
 */

// Must be set BEFORE `config/env.js` is first imported (the dynamic import in
// `before` below), or the send short-circuits to "not configured".
process.env.WA_AUTH = "test-token-not-a-real-credential";
process.env.WA_API_URL = "https://wasender.invalid/api/send-message";

/** Synthetic recipients — conspicuous enough to grep for in any output. */
const RAW_INPUT = "087 123 4567";
const E164 = "+353871234567";
const API_DIGITS = "353871234567";
const GROUP_JID = "120363000000000000@g.us";
const MESSAGE_BODY = "Your consultation with Dr Synthetic is confirmed";

/** Substrings that must never appear in an error string reaching a sink. */
const FORBIDDEN = [
  RAW_INPUT,
  E164,
  API_DIGITS,
  "871234567",
  GROUP_JID,
  "120363000000000000",
  MESSAGE_BODY,
  "test-token-not-a-real-credential",
  "raw=",
  "e164=",
  "apiTo=",
  "g.us",
];

function assertSafe(value: string, what: string): void {
  for (const needle of FORBIDDEN) {
    assert.ok(
      !value.includes(needle),
      `${what} leaked ${JSON.stringify(needle)}: ${JSON.stringify(value)}`,
    );
  }
}

type Wasender = typeof import("./wasender.js");

const realFetch = globalThis.fetch;

/** Replace fetch for one call sequence; returns the recorded request count. */
function stubFetch(handler: (call: number) => Promise<Response> | Response): { calls: () => number } {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return handler(calls);
  }) as typeof fetch;
  return { calls: () => calls };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("WhatsApp send errors never carry the recipient (PR-6)", () => {
  let wa: Wasender;

  before(async () => {
    wa = await import("./wasender.js");
  });

  after(() => {
    globalThis.fetch = realFetch;
  });

  it("formatWhatsAppSendError does not echo raw, E.164 or group recipients", () => {
    const formatted = wa.formatWhatsAppSendError({
      ok: false,
      message: "WaSender HTTP 422",
      to: E164,
      countryUsed: "ie",
    } as Parameters<Wasender["formatWhatsAppSendError"]>[0]);
    assertSafe(formatted, "formatWhatsAppSendError");
    assert.ok(formatted.includes("ie"), "the country hint stays — it is not personal data");
  });

  it("formatWhatsAppSendError ignores unknown phone-bearing fields", () => {
    // A stale caller (or a future field) must not be able to smuggle a number
    // through the formatter.
    const formatted = wa.formatWhatsAppSendError({
      ok: false,
      message: "WaSender HTTP 422",
      raw: RAW_INPUT,
      apiTo: API_DIGITS,
      to: E164,
    } as unknown as Parameters<Wasender["formatWhatsAppSendError"]>[0]);
    assertSafe(formatted, "formatWhatsAppSendError with legacy fields");
  });

  it("an invalid number is reported without the rejected input", async () => {
    const result = await wa.sendWhatsAppText({
      to: "not-a-phone-at-all",
      message: MESSAGE_BODY,
      hints: { orderCountryCode: "ie" },
    });
    assert.equal(result.ok, false);
    assertSafe(result.message ?? "", "invalid-number result.message");
    assertSafe(wa.formatWhatsAppSendError(result), "invalid-number formatted error");
    assert.ok(
      !(result.message ?? "").includes("not-a-phone-at-all"),
      "the rejected input must not be quoted back",
    );
  });

  it("a provider body that echoes the recipient is not returned as the error", async () => {
    stubFetch(() =>
      jsonResponse(422, {
        success: false,
        message: `Recipient ${API_DIGITS} is not registered (to=${E164}, text="${MESSAGE_BODY}")`,
      }),
    );
    const result = await wa.sendWhatsAppText({
      to: RAW_INPUT,
      message: MESSAGE_BODY,
      hints: { orderCountryCode: "ie" },
    });
    assert.equal(result.ok, false);
    assertSafe(result.message ?? "", "provider-body result.message");
    assertSafe(wa.formatWhatsAppSendError(result), "provider-body formatted error");
    assert.ok(
      (result.message ?? "").includes("422"),
      "the HTTP status is safe and must survive for diagnosis",
    );
  });

  it("the result object carries no recipient field beyond the documented one", async () => {
    stubFetch(() => jsonResponse(500, { message: `upstream failed for ${API_DIGITS}` }));
    const result = await wa.sendWhatsAppText({
      to: RAW_INPUT,
      message: MESSAGE_BODY,
      hints: { orderCountryCode: "ie" },
    });
    const keys = Object.keys(result).sort();
    const allowed = ["countryUsed", "message", "ok", "rateLimited", "skipped", "to"];
    for (const key of keys) {
      assert.ok(allowed.includes(key), `unexpected field on SendWhatsAppResult: ${key}`);
    }
    // `to` is the ONE deliberate recipient field: it feeds AutomationRun.recipient.
    assert.ok(!keys.includes("raw"), "raw must not survive on the result");
    assert.ok(!keys.includes("apiTo"), "apiTo must not survive on the result");
    assertSafe(JSON.stringify({ ...result, to: undefined }), "result minus AutomationRun.recipient");
  });

  it("a rate-limited provider reply still triggers exactly one retry", async () => {
    const stub = stubFetch((call) =>
      call === 1
        ? jsonResponse(429, {
            message: `Account protection: wait 6 seconds before messaging ${API_DIGITS} again`,
          })
        : jsonResponse(200, { success: true }),
    );
    const result = await wa.sendWhatsAppText({
      to: RAW_INPUT,
      message: MESSAGE_BODY,
      hints: { orderCountryCode: "ie" },
    });
    assert.equal(stub.calls(), 2, "rate-limit classification must survive body redaction");
    assert.equal(result.ok, true);
  });

  it("a 429 whose body is not a rate-limit notice does NOT gain a retry", async () => {
    // Parity guard: redaction must not widen the retry rule to "any 429".
    const stub = stubFetch(() => jsonResponse(429, { message: "Recipient blocked this sender" }));
    const result = await wa.sendWhatsAppText({
      to: RAW_INPUT,
      message: MESSAGE_BODY,
      hints: { orderCountryCode: "ie" },
    });
    assert.equal(stub.calls(), 1, "only a rate-limit notice earns the immediate retry");
    assert.equal(result.ok, false);
  });

  it("a group-send failure does not echo the group JID", async () => {
    stubFetch(() => jsonResponse(400, { message: `Group ${GROUP_JID} rejected the message` }));
    const result = await wa.sendWhatsAppGroupText({ to: GROUP_JID, message: MESSAGE_BODY });
    assert.equal(result.ok, false);
    assertSafe(result.message ?? "", "group result.message");
    assertSafe(wa.formatWhatsAppSendError(result), "group formatted error");
    assertSafe(JSON.stringify(result), "group result object");
  });

  it("a network exception is reported as a stable class, not the client's text", async () => {
    globalThis.fetch = (async () => {
      const err = new Error(
        `request to https://wasender.invalid/api/send-message failed, body {"to":"${API_DIGITS}","text":"${MESSAGE_BODY}"}`,
      );
      (err as Error & { cause?: { code?: string } }).cause = { code: "ECONNREFUSED" };
      throw err;
    }) as typeof fetch;
    const result = await wa.sendWhatsAppGroupText({ to: GROUP_JID, message: MESSAGE_BODY });
    assert.equal(result.ok, false);
    assertSafe(result.message ?? "", "network-exception result.message");
    assertSafe(wa.formatWhatsAppSendError(result), "network-exception formatted error");
    assert.ok(
      (result.message ?? "").includes("ECONNREFUSED"),
      "the errno is safe and must survive for diagnosis",
    );
  });

  it("a consent-denied skip carries no recipient", async () => {
    const result = await wa.sendWhatsAppText({
      to: RAW_INPUT,
      message: MESSAGE_BODY,
      patientConsent: false,
    });
    assert.equal(result.skipped, true);
    assertSafe(JSON.stringify(result), "consent-skip result object");
  });
});
