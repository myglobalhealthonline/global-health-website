import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";

loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * Suggestion 8 (code review 2026-07-05): OrderAppointment is the relational
 * replacement for the denormalized Order.appointmentIds array — real FK
 * integrity, no orphaned ids possible. Proves the schema-level guarantees
 * the application's dual-write depends on: uniqueness and cascade cleanup.
 */
describe("OrderAppointment join table", () => {
  let prisma: Awaited<typeof import("../../db/prisma.js")>["prisma"];
  let bootError: unknown = null;

  const uniq = `orderappt-test-${Date.now()}`;
  let orderId: string;
  let appointmentId: string;

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
      return;
    }
    const order = await prisma.order.create({
      data: {
        email: `${uniq}@test.local`,
        fullName: "Order Appointment Test",
        countryCode: "ie",
        currencyCode: "EUR",
        subtotalCents: 1000,
        totalCents: 1000,
      },
    });
    orderId = order.id;
    const appt = await prisma.appointment.create({
      data: {
        countryCode: "ie",
        consultationType: "GENERAL",
        fullName: "Order Appointment Test",
        email: `${uniq}@test.local`,
        consentAccepted: true,
      },
    });
    appointmentId = appt.id;
  });

  const skipIfNoDb = (): boolean => {
    if (bootError) {
      console.warn("[skip] DB unreachable:", (bootError as Error).message?.slice(0, 80));
      return true;
    }
    return false;
  };

  it("links an order to an appointment", async (t) => {
    if (skipIfNoDb()) return t.skip();
    await prisma.orderAppointment.create({ data: { orderId, appointmentId } });
    const rows = await prisma.orderAppointment.findMany({ where: { orderId } });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].appointmentId, appointmentId);
  });

  it("rejects a duplicate (orderId, appointmentId) pair", async (t) => {
    if (skipIfNoDb()) return t.skip();
    await assert.rejects(() =>
      prisma.orderAppointment.create({ data: { orderId, appointmentId } }),
    );
  });

  it("createMany with skipDuplicates is a safe no-op on retry", async (t) => {
    if (skipIfNoDb()) return t.skip();
    const result = await prisma.orderAppointment.createMany({
      data: [{ orderId, appointmentId }],
      skipDuplicates: true,
    });
    assert.equal(result.count, 0, "already-linked pair is silently skipped, not an error");
  });

  it("cascade-deletes the join row when the appointment is deleted", async (t) => {
    if (skipIfNoDb()) return t.skip();
    await prisma.appointment.delete({ where: { id: appointmentId } });
    const rows = await prisma.orderAppointment.findMany({ where: { orderId } });
    assert.equal(rows.length, 0, "join row removed, not left dangling — the exact bug this table fixes");
  });

  it("cleans up fixtures", async (t) => {
    if (skipIfNoDb()) return t.skip();
    await prisma.order.deleteMany({ where: { id: orderId } });
  });
});
