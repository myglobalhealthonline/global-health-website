import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";

loadEnv({ path: join(__dirname, "../../..", ".env") });

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Mirrors totp.ts's private base32Decode — not exported, so replicated here. */
function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error("invalid base32 char");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** Mirrors totp.ts's private computeTotp — not exported, so replicated here
 *  so the test can generate a currently-valid token for a known secret. */
function computeCurrentTotp(secret: string): string {
  const secretBytes = base32Decode(secret);
  const T = Math.floor(Date.now() / 1000 / 30);
  const counter = Buffer.alloc(8);
  const hi = Math.floor(T / 0x100000000);
  const lo = T >>> 0;
  counter.writeUInt32BE(hi, 0);
  counter.writeUInt32BE(lo, 4);
  const hmac = createHmac("sha1", secretBytes).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, "0");
}

/**
 * SF12 (code review 2026-07-05): two-factor is the auth security surface
 * for doctors accessing PHI (medical-access-guard requires it) and had
 * zero test coverage. Also regression-covers SF10 (removed `as any` Prisma
 * casts) — these tests would fail immediately if a field name typo slipped
 * back in unnoticed.
 */
describe("two-factor", () => {
  let prisma: Awaited<typeof import("../../db/prisma.js")>["prisma"];
  let svc: typeof import("./two-factor.service.js");
  let bootError: unknown = null;

  const uniq = `2fa-test-${Date.now()}`;
  let userId: string;
  const password = "correct-horse-battery-staple";

  before(async () => {
    try {
      // Local .env doesn't set PHI_ENCRYPTION_KEY (only the deployed
      // environment does) — set it here so this test exercises real
      // encryption rather than phi-crypto's plaintext no-op fallback.
      process.env.PHI_ENCRYPTION_KEY ??= "test-only-phi-key-at-least-16-chars";
      prisma = (await import("../../db/prisma.js")).prisma;
      svc = await import("./two-factor.service.js");
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email: `${uniq}@test.local`, passwordHash, fullName: "2FA Test User", role: "DOCTOR" },
    });
    userId = user.id;
  });

  const skipIfNoDb = (): boolean => {
    if (bootError) {
      console.warn("[skip] DB unreachable:", (bootError as Error).message?.slice(0, 80));
      return true;
    }
    return false;
  };

  let secret: string;
  let backupCodes: string[];

  it("initiateTwoFactor returns a secret, QR URI, and 10 backup codes without persisting anything", async (t) => {
    if (skipIfNoDb()) return t.skip();
    const result = await svc.initiateTwoFactor(userId);
    secret = result.secret;
    backupCodes = result.backupCodes;
    assert.ok(secret.length > 0);
    assert.ok(result.qrUri.startsWith("otpauth://totp/"));
    assert.equal(backupCodes.length, 10);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    assert.equal(user.twoFactorEnabled, false, "not enabled until confirmed");
    assert.equal(user.twoFactorSecret, null);
  });

  it("confirmTwoFactor rejects an invalid token", async (t) => {
    if (skipIfNoDb()) return t.skip();
    await assert.rejects(
      () => svc.confirmTwoFactor(userId, "000000", secret, backupCodes),
      /invalid or has expired/i,
    );
  });

  it("confirmTwoFactor with a valid token enables 2FA and stores hashed backup codes only", async (t) => {
    if (skipIfNoDb()) return t.skip();
    const token = computeCurrentTotp(secret);
    await svc.confirmTwoFactor(userId, token, secret, backupCodes);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    assert.equal(user.twoFactorEnabled, true);
    assert.ok(user.twoFactorSecret, "secret persisted (encrypted)");
    assert.notEqual(user.twoFactorSecret, secret, "stored secret is not plaintext");
    assert.equal(user.twoFactorBackupCodes.length, 10);
    assert.ok(
      !user.twoFactorBackupCodes.includes(backupCodes[0]),
      "backup codes are hashed, not stored plaintext",
    );
  });

  it("initiateTwoFactor refuses to re-run setup once already enabled", async (t) => {
    if (skipIfNoDb()) return t.skip();
    await assert.rejects(() => svc.initiateTwoFactor(userId), /already enabled/i);
  });

  it("verifyTwoFactorLogin accepts a valid current TOTP token", async (t) => {
    if (skipIfNoDb()) return t.skip();
    const token = computeCurrentTotp(secret);
    const ok = await svc.verifyTwoFactorLogin(userId, token);
    assert.equal(ok, true);
  });

  it("verifyTwoFactorLogin rejects a wrong token", async (t) => {
    if (skipIfNoDb()) return t.skip();
    const ok = await svc.verifyTwoFactorLogin(userId, "111111");
    assert.equal(ok, false);
  });

  it("verifyTwoFactorLogin accepts a valid backup code exactly once", async (t) => {
    if (skipIfNoDb()) return t.skip();
    const code = backupCodes[1];
    const first = await svc.verifyTwoFactorLogin(userId, code);
    assert.equal(first, true, "first use of the backup code succeeds");

    const second = await svc.verifyTwoFactorLogin(userId, code);
    assert.equal(second, false, "backup code is single-use — second attempt fails");

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    assert.equal(user.twoFactorBackupCodes.length, 9, "consumed code removed from the stored set");
  });

  it("disableTwoFactor rejects the wrong password", async (t) => {
    if (skipIfNoDb()) return t.skip();
    await assert.rejects(() => svc.disableTwoFactor(userId, "wrong-password"));
  });

  it("disableTwoFactor with the correct password clears all 2FA fields", async (t) => {
    if (skipIfNoDb()) return t.skip();
    await svc.disableTwoFactor(userId, password);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    assert.equal(user.twoFactorEnabled, false);
    assert.equal(user.twoFactorSecret, null);
    assert.equal(user.twoFactorBackupCodes.length, 0);
  });

  it("verifyTwoFactorLogin returns false once 2FA is disabled", async (t) => {
    if (skipIfNoDb()) return t.skip();
    const ok = await svc.verifyTwoFactorLogin(userId, computeCurrentTotp(secret));
    assert.equal(ok, false);
  });

  it("cleans up fixtures", async (t) => {
    if (skipIfNoDb()) return t.skip();
    await prisma.auditLog.deleteMany({ where: { entityId: userId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: userId } });
  });
});
