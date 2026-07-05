import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";

loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * Regression test for SF8 (code review 2026-07-05): `readRotationCursor` +
 * `writeRotationCursor` was a non-atomic read-then-write — two concurrent
 * assignment requests for the same (country, service, language) lane could
 * both read the same cursor value and both advance it by exactly one,
 * silently skewing the round-robin toward whichever doctor sat at that
 * index. `claimNextRotationCursor` replaces that pair with one atomic
 * SQL statement; this proves concurrent callers never collide.
 */
describe("gp-config rotation cursor", () => {
  let prisma: Awaited<typeof import("../../db/prisma.js")>["prisma"];
  let svc: typeof import("./gp-config.service.js");
  let bootError: unknown = null;

  const lane = {
    country: `zz-test-${Date.now()}`,
    serviceId: "svc-test",
    lang: "en",
  };

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      svc = await import("./gp-config.service.js");
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
    }
  });

  const skipIfNoDb = (): boolean => {
    if (bootError) {
      console.warn("[skip] DB unreachable:", (bootError as Error).message?.slice(0, 80));
      return true;
    }
    return false;
  };

  const cleanup = () =>
    prisma.setting.deleteMany({
      where: { key: `gp_rotation_cursor:${lane.country}:${lane.serviceId}:${lane.lang}` },
    });

  it("concurrent claims never return the same cursor value", async (t) => {
    if (skipIfNoDb()) return t.skip();
    await cleanup();
    try {
      const claims = await Promise.all(
        Array.from({ length: 10 }, () =>
          svc.claimNextRotationCursor(lane.country, lane.serviceId, lane.lang),
        ),
      );
      const unique = new Set(claims);
      assert.equal(unique.size, claims.length, "every concurrent claim got a distinct value");
      assert.deepEqual([...unique].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    } finally {
      await cleanup();
    }
  });

  it("sequential claims advance monotonically from zero", async (t) => {
    if (skipIfNoDb()) return t.skip();
    await cleanup();
    try {
      const first = await svc.claimNextRotationCursor(lane.country, lane.serviceId, lane.lang);
      const second = await svc.claimNextRotationCursor(lane.country, lane.serviceId, lane.lang);
      const third = await svc.claimNextRotationCursor(lane.country, lane.serviceId, lane.lang);
      assert.deepEqual([first, second, third], [0, 1, 2]);
    } finally {
      await cleanup();
    }
  });
});
