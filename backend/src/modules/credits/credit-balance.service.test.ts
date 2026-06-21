import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";

loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * Money-race integration tests (§27 CRITICALs). Requires Postgres; skips when
 * DATABASE_URL is unreachable. These prove the counter is the sole spend
 * authority and that commit/release are mutually exclusive per reservation.
 */
describe("credit-balance money races", () => {
  let prisma: Awaited<typeof import("../../db/prisma.js")>["prisma"];
  let svc: typeof import("./credit-balance.service.js");
  let makeSubscriptionFixture: typeof import("../subscriptions/test-support.js")["makeSubscriptionFixture"];
  let bootError: unknown = null;

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      svc = await import("./credit-balance.service.js");
      makeSubscriptionFixture = (await import("../subscriptions/test-support.js"))
        .makeSubscriptionFixture;
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

  it("last-credit race: only one of two concurrent reserves wins", async (t) => {
    if (skipIfNoDb()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "race", { consultationBalance: 1 });
    try {
      const reserveOnce = (reservationId: string) =>
        prisma.$transaction((tx) =>
          svc.reserveCredits(tx, {
            userSubscriptionId: fx.subscriptionId,
            userId: fx.userId,
            kind: "CONSULTATION",
            amount: 1,
            reservationId,
            reservedUntil: new Date(Date.now() + 900_000),
          }),
        );

      const [a, b] = await Promise.all([reserveOnce("res-a"), reserveOnce("res-b")]);
      assert.equal([a, b].filter(Boolean).length, 1, "exactly one reserve succeeds");

      const balance = await svc.getBalance(fx.subscriptionId, "CONSULTATION");
      assert.equal(balance, 0, "counter never goes negative");
    } finally {
      await fx.cleanup();
    }
  });

  it("commit then release is a no-op (mutual exclusion)", async (t) => {
    if (skipIfNoDb()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "commit", { consultationBalance: 1 });
    try {
      const reservationId = "res-commit";
      await prisma.$transaction((tx) =>
        svc.reserveCredits(tx, {
          userSubscriptionId: fx.subscriptionId,
          userId: fx.userId,
          kind: "CONSULTATION",
          amount: 1,
          reservationId,
          reservedUntil: new Date(Date.now() + 900_000),
        }),
      );

      const committed = await prisma.$transaction((tx) =>
        svc.commitReservation(tx, {
          userSubscriptionId: fx.subscriptionId,
          userId: fx.userId,
          kind: "CONSULTATION",
          amount: 1,
          reservationId,
        }),
      );
      assert.equal(committed, "committed");

      const released = await prisma.$transaction((tx) =>
        svc.releaseReservation(tx, {
          userSubscriptionId: fx.subscriptionId,
          userId: fx.userId,
          kind: "CONSULTATION",
          amount: 1,
          reservationId,
        }),
      );
      assert.equal(released, "already_committed", "release after commit is blocked");

      const balance = await svc.getBalance(fx.subscriptionId, "CONSULTATION");
      assert.equal(balance, 0, "credit stays spent — never re-released");
    } finally {
      await fx.cleanup();
    }
  });

  it("release returns the credit and is idempotent", async (t) => {
    if (skipIfNoDb()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "release", { consultationBalance: 1 });
    try {
      const reservationId = "res-release";
      await prisma.$transaction((tx) =>
        svc.reserveCredits(tx, {
          userSubscriptionId: fx.subscriptionId,
          userId: fx.userId,
          kind: "CONSULTATION",
          amount: 1,
          reservationId,
          reservedUntil: new Date(Date.now() - 1),
        }),
      );
      assert.equal(await svc.getBalance(fx.subscriptionId, "CONSULTATION"), 0);

      const r1 = await prisma.$transaction((tx) =>
        svc.releaseReservation(tx, {
          userSubscriptionId: fx.subscriptionId,
          userId: fx.userId,
          kind: "CONSULTATION",
          amount: 1,
          reservationId,
        }),
      );
      assert.equal(r1, "released");
      assert.equal(await svc.getBalance(fx.subscriptionId, "CONSULTATION"), 1, "credit restored");

      const r2 = await prisma.$transaction((tx) =>
        svc.releaseReservation(tx, {
          userSubscriptionId: fx.subscriptionId,
          userId: fx.userId,
          kind: "CONSULTATION",
          amount: 1,
          reservationId,
        }),
      );
      assert.equal(r2, "already_released", "double-release blocked");
      assert.equal(await svc.getBalance(fx.subscriptionId, "CONSULTATION"), 1, "no double restore");
    } finally {
      await fx.cleanup();
    }
  });

  it("monthly grant resets prior unused + grants; duplicate period is a no-op", async (t) => {
    if (skipIfNoDb()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "grant", { consultationBalance: 2 });
    try {
      const periodStart = new Date("2026-07-01T00:00:00Z");
      const first = await prisma.$transaction((tx) =>
        svc.grantMonthlyCredits(tx, {
          userSubscriptionId: fx.subscriptionId,
          userId: fx.userId,
          periodStart,
          consultationCredits: 3,
          wellnessCredits: 0,
        }),
      );
      assert.equal(first, true);
      assert.equal(
        await svc.getBalance(fx.subscriptionId, "CONSULTATION"),
        3,
        "reset to snapshot amount (no rollover from prior 2)",
      );

      const dup = await prisma.$transaction((tx) =>
        svc.grantMonthlyCredits(tx, {
          userSubscriptionId: fx.subscriptionId,
          userId: fx.userId,
          periodStart,
          consultationCredits: 3,
          wellnessCredits: 0,
        }),
      );
      assert.equal(dup, false, "duplicate period grant is a no-op");
      assert.equal(await svc.getBalance(fx.subscriptionId, "CONSULTATION"), 3);
    } finally {
      await fx.cleanup();
    }
  });

  it("concurrent wellness redemption at exact balance: only one succeeds", async (t) => {
    if (skipIfNoDb()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "wellrace", { wellnessBalance: 6 });
    try {
      const reserveSix = (reservationId: string) =>
        prisma.$transaction((tx) =>
          svc.reserveCredits(tx, {
            userSubscriptionId: fx.subscriptionId,
            userId: fx.userId,
            kind: "WELLNESS",
            amount: 6,
            reservationId,
            reservedUntil: new Date(Date.now() + 900_000),
          }),
        );
      const [a, b] = await Promise.all([reserveSix("well-a"), reserveSix("well-b")]);
      assert.equal([a, b].filter(Boolean).length, 1, "only one 6-credit redemption wins");
      assert.equal(await svc.getBalance(fx.subscriptionId, "WELLNESS"), 0);
    } finally {
      await fx.cleanup();
    }
  });

  it("manual adjustCredits keeps counter authoritative + idempotent", async (t) => {
    if (skipIfNoDb()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "adjust", { consultationBalance: 0 });
    try {
      const key = "admin:a1:req1";
      const r1 = await svc.adjustCredits({
        userSubscriptionId: fx.subscriptionId,
        kind: "CONSULTATION",
        delta: 5,
        reason: "ADJUSTMENT",
        idempotencyKey: key,
        actorAdminId: "a1",
      });
      assert.equal(r1.balance, 5);
      const r2 = await svc.adjustCredits({
        userSubscriptionId: fx.subscriptionId,
        kind: "CONSULTATION",
        delta: 5,
        reason: "ADJUSTMENT",
        idempotencyKey: key,
        actorAdminId: "a1",
      });
      assert.equal(r2.balance, 5, "same key → no double apply");
    } finally {
      await fx.cleanup();
    }
  });
});
