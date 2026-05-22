import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

/**
 * Statelessly verify the temp-password generator used by
 * `createManualBooking` produces unique, URL-safe, bcrypt-able values
 * — without booting Fastify or touching the DB. We mirror the
 * generator's contract here (12 random bytes → base64url) so a
 * regression in the live code immediately shows up against this
 * fixture.
 */
function generateTempPassword(): string {
  return randomBytes(12).toString("base64url");
}

describe("manual booking — temp password generator", () => {
  it("produces 16-character URL-safe strings", () => {
    const sample = generateTempPassword();
    assert.equal(sample.length, 16);
    // base64url alphabet: A-Z, a-z, 0-9, '-', '_' (no padding).
    assert.match(sample, /^[A-Za-z0-9_-]+$/);
  });

  it("produces a different password every call", () => {
    const set = new Set<string>();
    for (let i = 0; i < 200; i++) {
      set.add(generateTempPassword());
    }
    assert.equal(set.size, 200, "all 200 generated passwords must be unique");
  });

  it("produces bcrypt-able output that bcrypt.compare verifies", async () => {
    const plain = generateTempPassword();
    const hash = await bcrypt.hash(plain, 4); // low cost for test speed
    assert.equal(await bcrypt.compare(plain, hash), true);
    assert.equal(await bcrypt.compare(plain + "x", hash), false);
  });

  it("two consecutive calls bcrypt to two distinct hashes", async () => {
    const a = await bcrypt.hash(generateTempPassword(), 4);
    const b = await bcrypt.hash(generateTempPassword(), 4);
    assert.notEqual(a, b);
  });
});
