import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

type CryptoMod = typeof import("./phi-crypto.js");

describe("phi-crypto", () => {
  let m: CryptoMod;

  before(async () => {
    // phi-crypto reads env.ts, which validates process.env on import — give
    // it the minimal required vars so the bare test environment doesn't throw.
    process.env.DATABASE_URL ??= "postgresql://u:p@localhost:5432/db";
    process.env.AUTH_JWT_SECRET ??= "test-only-auth-secret-min-32-characters-long";
    process.env.PHI_ENCRYPTION_KEY = "test-only-phi-key-at-least-16-chars";
    m = await import("./phi-crypto.js");
  });

  it("round-trips a value through encrypt/decrypt", () => {
    const plain = "PT-123456789";
    const enc = m.encryptPhi(plain);
    assert.ok(enc?.startsWith("phi:v1:"), "ciphertext should be enveloped");
    assert.notEqual(enc, plain);
    assert.equal(m.decryptPhi(enc), plain);
  });

  it("produces a different ciphertext each call (random IV)", () => {
    const a = m.encryptPhi("same");
    const b = m.encryptPhi("same");
    assert.notEqual(a, b);
    assert.equal(m.decryptPhi(a), "same");
    assert.equal(m.decryptPhi(b), "same");
  });

  it("passes through legacy plaintext on decrypt", () => {
    assert.equal(m.decryptPhi("legacy-plaintext"), "legacy-plaintext");
  });

  it("treats null/empty safely", () => {
    assert.equal(m.encryptPhi(null), null);
    assert.equal(m.encryptPhi(""), "");
    assert.equal(m.decryptPhi(null), null);
  });

  it("does not double-encrypt an already-enveloped value", () => {
    const once = m.encryptPhi("x");
    assert.equal(m.encryptPhi(once), once);
  });

  it("encrypts/decrypts only the PHI fields on an object", () => {
    const written = m.encryptPhiFields({
      nationalIdNumber: "N-1",
      taxIdNumber: "T-1",
      passportNumber: null,
      fullName: "Jane",
    } as Record<string, string | null>);
    assert.ok(String(written.nationalIdNumber).startsWith("phi:v1:"));
    assert.ok(String(written.taxIdNumber).startsWith("phi:v1:"));
    assert.equal(written.passportNumber, null);
    assert.equal(written.fullName, "Jane");

    const read = m.decryptPhiFields(written);
    assert.equal(read.nationalIdNumber, "N-1");
    assert.equal(read.taxIdNumber, "T-1");
    assert.equal(read.fullName, "Jane");
  });
});
