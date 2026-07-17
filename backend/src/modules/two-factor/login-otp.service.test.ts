import assert from "node:assert/strict";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";
import { deleteAuditLogs } from "../../test-utils/audit-cleanup.js";

loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * Task 4 (docs/security/phi-access-recovery-plan-2026-07-17.md): email-OTP
 * second factor + trusted device. DB-backed like two-factor.service.test.ts
 * — skips (rather than fails) when no local DB is reachable.
 */
describe("login-otp", () => {
  let prisma: Awaited<typeof import("../../db/prisma.js")>["prisma"];
  let svc: typeof import("./login-otp.service.js");
  let bootError: unknown = null;

  const uniq = `login-otp-test-${Date.now()}`;
  let userId: string;

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      svc = await import("./login-otp.service.js");
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
      return;
    }
    const passwordHash = await bcrypt.hash("correct-horse-battery-staple", 10);
    const user = await prisma.user.create({
      data: { email: `${uniq}@test.local`, passwordHash, fullName: "Login OTP Test User", role: "DOCTOR" },
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

  let code: string;

  it("issueLoginOtp returns a 6-digit code without touching twoFactorVerifiedAt", async (t) => {
    if (skipIfNoDb()) return t.skip();
    code = await svc.issueLoginOtp(userId);
    assert.match(code, /^\d{6}$/);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    assert.equal(user.twoFactorVerifiedAt, null, "not verified until a correct code is submitted");
  });

  it("verifyLoginOtp rejects a wrong code and decrements toward the attempt cap", async (t) => {
    if (skipIfNoDb()) return t.skip();
    const result = await svc.verifyLoginOtp(userId, "000000");
    assert.deepEqual(result, { ok: false, reason: "wrong_code" });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    assert.equal(user.twoFactorVerifiedAt, null);
  });

  it("verifyLoginOtp accepts the correct code and stamps twoFactorVerifiedAt", async (t) => {
    if (skipIfNoDb()) return t.skip();
    const result = await svc.verifyLoginOtp(userId, code);
    assert.deepEqual(result, { ok: true });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    assert.ok(user.twoFactorVerifiedAt, "twoFactorVerifiedAt stamped — same field TOTP enrollment sets");
  });

  it("a consumed code cannot be reused (reports expired, not a fresh wrong-code count)", async (t) => {
    if (skipIfNoDb()) return t.skip();
    const result = await svc.verifyLoginOtp(userId, code);
    assert.equal(result.ok, false);
    assert.equal((result as { reason: string }).reason, "no_pending_code");
  });

  it("5 wrong attempts exhausts the code (further attempts report no pending code, not more wrong_code)", async (t) => {
    if (skipIfNoDb()) return t.skip();
    const fresh = await svc.issueLoginOtp(userId);
    void fresh;
    for (let i = 0; i < 5; i++) {
      const result = await svc.verifyLoginOtp(userId, "111111");
      assert.equal(result.ok, false);
    }
    // The 6th attempt (even with the right code, hypothetically) finds no
    // usable pending row — the 5th miss already consumed it.
    const result = await svc.verifyLoginOtp(userId, "111111");
    assert.equal((result as { reason: string }).reason, "no_pending_code");
  });

  it("issuing a new code invalidates the previous one", async (t) => {
    if (skipIfNoDb()) return t.skip();
    const first = await svc.issueLoginOtp(userId);
    const second = await svc.issueLoginOtp(userId);
    assert.notEqual(first, second, "sanity: two random codes shouldn't collide");
    const usingFirst = await svc.verifyLoginOtp(userId, first);
    assert.equal(usingFirst.ok, false, "first code was superseded by the second issue");
    const usingSecond = await svc.verifyLoginOtp(userId, second);
    assert.equal(usingSecond.ok, true);
  });

  let deviceToken: string;

  it("issueTrustedDevice + isTrustedDevice round-trip", async (t) => {
    if (skipIfNoDb()) return t.skip();
    deviceToken = await svc.issueTrustedDevice(userId, "test-agent/1.0");
    const ok = await svc.isTrustedDevice(userId, deviceToken);
    assert.equal(ok, true);
  });

  it("isTrustedDevice rejects a wrong token and a mismatched user", async (t) => {
    if (skipIfNoDb()) return t.skip();
    assert.equal(await svc.isTrustedDevice(userId, "not-the-real-token"), false);
    assert.equal(await svc.isTrustedDevice("some-other-user-id", deviceToken), false);
    assert.equal(await svc.isTrustedDevice(userId, undefined), false);
  });

  it("revokeTrustedDevices removes the row so the same token no longer verifies", async (t) => {
    if (skipIfNoDb()) return t.skip();
    await svc.revokeTrustedDevices(userId);
    assert.equal(await svc.isTrustedDevice(userId, deviceToken), false);
  });

  it("cleans up fixtures", async (t) => {
    if (skipIfNoDb()) return t.skip();
    await deleteAuditLogs(prisma, { entityId: userId }).catch(() => {});
    await prisma.loginOtp.deleteMany({ where: { userId } });
    await prisma.trustedDevice.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });
});
