// MUST be first: sets process.env before config/env.ts freezes its snapshot.
import { EXPIRED_PFX, FIXTURE_PASSWORD, VALID_PFX } from "./client.test-env.js";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { loadSuklPfx, readSuklPfx, resetSuklCertificateCache } from "./certificate.js";
import {
  expiryWarnThreshold,
  inspectPkcs12,
  inspectSuklCertificate,
  resetSuklCertificateInfoCache,
} from "./certificate-validator.js";
import { fingerprintSuffix, isSuklConfigured, isSuklServiceConfigured } from "./config.js";
import { SuklError } from "./errors.js";

/**
 * Certificate loader + validator.
 *
 * Note the split: `config/env.ts` parses `process.env` once and exports a FROZEN
 * snapshot, so a test cannot steer the env-driven wrappers by mutating
 * `process.env` — it is already too late. The negative cases therefore drive the
 * pure functions (`readSuklPfx`, `inspectPkcs12`), which take their inputs
 * explicitly, while `loadSuklPfx` / `inspectSuklCertificate` are covered on the
 * happy path that client.test-env.ts configures.
 */

const validPfx = () => readFileSync(VALID_PFX);
const expiredPfx = () => readFileSync(EXPIRED_PFX);

test("the gate is satisfied by the fixture env, and the service gates are not", () => {
  assert.equal(isSuklConfigured(), true);
  // The fixture env sets no service URL, so the certificate gate and the network
  // gate are proven independent: a valid certificate must not imply a reachable
  // endpoint.
  assert.equal(isSuklServiceConfigured("cuep"), false);
  assert.equal(isSuklServiceConfigured("common"), false);
});

test("loadSuklPfx reads the configured path and carries the password through", () => {
  resetSuklCertificateCache();
  const loaded = loadSuklPfx();
  assert.equal(loaded.source, "path");
  assert.equal(loaded.passphrase, FIXTURE_PASSWORD);
  assert.ok(loaded.pfx.byteLength > 500);
});

test("base64 wins over path when both are supplied", () => {
  const { pfx, source } = readSuklPfx({
    base64: validPfx().toString("base64"),
    path: "C:\\this\\must\\not\\be\\read.pfx",
  });
  assert.equal(source, "base64");
  assert.deepEqual(pfx, validPfx());
});

test("a truncated base64 value is rejected before it reaches TLS", () => {
  assert.throws(
    () => readSuklPfx({ base64: "AAAA" }),
    (e: unknown) =>
      e instanceof SuklError && e.code === "SUKL_CERTIFICATE_INVALID" && /base64/i.test(e.message),
  );
});

test("no certificate source at all is SUKL_NOT_CONFIGURED", () => {
  assert.throws(
    () => readSuklPfx({}),
    (e: unknown) =>
      e instanceof SuklError &&
      e.code === "SUKL_NOT_CONFIGURED" &&
      e.message.includes("SUKL_TEST_PFX_BASE64"),
  );
  // Blank counts as unset, matching the optionalSecret convention in env.ts.
  assert.throws(
    () => readSuklPfx({ base64: "   ", path: "  " }),
    (e: unknown) => e instanceof SuklError && e.code === "SUKL_NOT_CONFIGURED",
  );
});

test("an unreadable path fails without disclosing the path", () => {
  try {
    readSuklPfx({ path: "C:\\secure\\sukl\\does-not-exist.pfx" });
    assert.fail("expected a SuklError");
  } catch (e) {
    assert.ok(e instanceof SuklError);
    assert.equal(e.code, "SUKL_CERTIFICATE_INVALID");
    // The resolved path is the one hint that locates a private key on disk.
    assert.ok(!e.message.includes("does-not-exist"));
    assert.ok(!e.safeMessage.includes("does-not-exist"));
  }
});

test("extracts subject, issuer, expiry and fingerprint from the PKCS#12", async () => {
  resetSuklCertificateInfoCache();
  const info = await inspectSuklCertificate({ force: true });
  assert.equal(info.source, "path");
  assert.match(info.subject, /CN=sukl-test-fixture/);
  assert.match(info.subject, /O=Global Health TEST FIXTURE/);
  assert.match(info.issuer, /CN=sukl-test-fixture/); // self-signed
  assert.match(info.fingerprint256, /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
  assert.equal(info.expired, false);
  assert.ok(info.daysUntilExpiry > 365);
  // The handshake completing at all is what proves the private key is usable.
  assert.equal(info.hasPrivateKey, true);
});

test("a wrong password is rejected and the password never appears in the message", async () => {
  const password = "definitely-not-the-password";
  try {
    await inspectPkcs12({ pfx: validPfx(), passphrase: password, source: "path" });
    assert.fail("expected a SuklError");
  } catch (e) {
    assert.ok(e instanceof SuklError);
    assert.equal(e.code, "SUKL_CERTIFICATE_INVALID");
    assert.ok(!e.message.includes(password));
    assert.ok(!e.safeMessage.includes(password));
  }
});

test("a corrupt blob is rejected as SUKL_CERTIFICATE_INVALID", async () => {
  // Long enough to clear the plausibility check, but not a PKCS#12.
  const junk = Buffer.alloc(256, 0x41);
  await assert.rejects(
    () => inspectPkcs12({ pfx: junk, passphrase: FIXTURE_PASSWORD, source: "base64" }),
    (e: unknown) => e instanceof SuklError && e.code === "SUKL_CERTIFICATE_INVALID",
  );
});

test("an expired certificate parses but raises SUKL_CERTIFICATE_EXPIRED", async () => {
  try {
    await inspectPkcs12({ pfx: expiredPfx(), passphrase: FIXTURE_PASSWORD, source: "path" });
    assert.fail("expected a SuklError");
  } catch (e) {
    assert.ok(e instanceof SuklError);
    assert.equal(e.code, "SUKL_CERTIFICATE_EXPIRED");
    // The date is useful to an admin and is not sensitive.
    assert.match(e.message, /2024/);
  }
});

test("expiry is evaluated against the supplied clock, not only the wall clock", async () => {
  const fresh = await inspectPkcs12({
    pfx: validPfx(),
    passphrase: FIXTURE_PASSWORD,
    source: "path",
  });
  // Same certificate, evaluated a year later: fewer days, still not expired.
  const later = await inspectPkcs12({
    pfx: validPfx(),
    passphrase: FIXTURE_PASSWORD,
    source: "path",
    now: new Date(Date.now() + 365 * 86_400_000),
  });
  assert.ok(later.daysUntilExpiry < fresh.daysUntilExpiry);
  assert.equal(later.fingerprint256, fresh.fingerprint256);

  // The valid fixture runs to 2036, so a clock past that must report expiry.
  await assert.rejects(
    () =>
      inspectPkcs12({
        pfx: validPfx(),
        passphrase: FIXTURE_PASSWORD,
        source: "path",
        now: new Date("2040-01-01T00:00:00Z"),
      }),
    (e: unknown) => e instanceof SuklError && e.code === "SUKL_CERTIFICATE_EXPIRED",
  );
});

test("a cached result recomputes its day count instead of going stale", async () => {
  resetSuklCertificateInfoCache();
  const fresh = await inspectSuklCertificate({ force: true });
  const cached = await inspectSuklCertificate({
    now: new Date(Date.now() + 365 * 86_400_000),
  });
  assert.ok(cached.daysUntilExpiry < fresh.daysUntilExpiry);
  assert.equal(cached.fingerprint256, fresh.fingerprint256);
});

test("expiryWarnThreshold reports the tightest band crossed", () => {
  assert.equal(expiryWarnThreshold(120), null);
  assert.equal(expiryWarnThreshold(61), null);
  assert.equal(expiryWarnThreshold(60), 60);
  assert.equal(expiryWarnThreshold(31), 60);
  assert.equal(expiryWarnThreshold(30), 30);
  assert.equal(expiryWarnThreshold(8), 14);
  assert.equal(expiryWarnThreshold(7), 7);
  assert.equal(expiryWarnThreshold(0), 7);
  assert.equal(expiryWarnThreshold(-5), 7);
});

test("only the last 8 fingerprint characters are ever published", () => {
  const full = "AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89";
  const suffix = fingerprintSuffix(full);
  assert.equal(suffix, "23456789");
  assert.equal(suffix.length, 8);
  assert.ok(!full.replace(/:/g, "").startsWith(suffix));
});
