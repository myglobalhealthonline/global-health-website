import assert from "node:assert/strict";
import { before, it, mock } from "node:test";

let outcome: { accepted?: string[]; rejected?: string[]; messageId?: string } = {};
let failure: unknown;
let send: typeof import("./smtp-send.js").sendViaSmtp;

before(async () => {
  mock.module("../../config/env.js", { namedExports: { env: { SMTP_HOST: "smtp.example.test", SMTP_PORT: 465, SMTP_USER: "sender@example.test", SMTP_PASSWORD: "test" } } });
  mock.module("nodemailer", { defaultExport: { createTransport: () => ({ sendMail: async () => {
    if (failure) throw failure;
    return outcome;
  } }) } });
  send = (await import("./smtp-send.js")).sendViaSmtp;
});

it("distinguishes explicit rejection from an ambiguous transport failure", async () => {
  const input = { to: "patient@example.test", subject: "Test", html: "<p>Test</p>", text: "Test" };
  for (const responseCode of [421, 450, 550]) {
    failure = { responseCode, message: "Rejected" };
    const result = await send(input);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.notAccepted, true);
  }
  failure = { code: "ETIMEDOUT", message: "Timed out" };
  const ambiguous = await send(input);
  assert.equal(ambiguous.ok, false);
  if (!ambiguous.ok) assert.equal(ambiguous.notAccepted, false);
  failure = undefined;
  outcome = { accepted: [], rejected: [input.to] };
  const rejected = await send(input);
  assert.equal(rejected.ok, false);
  if (!rejected.ok) assert.equal(rejected.notAccepted, true);
  outcome = { accepted: [input.to], messageId: "provider-1" };
  assert.deepEqual(await send(input), { ok: true, id: "provider-1" });
});
